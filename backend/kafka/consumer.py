"""
Kafka Consumer — background service that consumes Avro events and writes to PostgreSQL
"""
import json
import logging
import signal
import sys
import uuid
from datetime import datetime, timezone

from confluent_kafka import Consumer, KafkaError
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, "/app")

from config import settings
from db.database import SessionLocal
from models.listing import RawListing, Listing, ListingStatus
from models.inquiry import AnalyticsEvent
from kafka.schemas.avro_schemas import (
    LISTING_CREATED_SCHEMA,
    LISTING_UPDATED_SCHEMA,
    INQUIRY_SUBMITTED_SCHEMA,
    ANALYTICS_PAGEVIEW_SCHEMA,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("kafka-consumer")

running = True


def handle_signal(sig, frame):
    global running
    logger.info("Shutdown signal received...")
    running = False


signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)


def get_deserializer(schema_dict: dict, schema_registry_client: SchemaRegistryClient) -> AvroDeserializer:
    return AvroDeserializer(schema_registry_client, json.dumps(schema_dict))


def handle_listing_created(payload: dict, db: Session, kafka_offset: int, partition: int):
    """Write raw listing to raw_listings table for Airflow to process."""
    raw = RawListing(
        kafka_topic=settings.topic_listing_created,
        kafka_offset=kafka_offset,
        kafka_partition=partition,
        payload=payload,
        processed=False,
    )
    db.add(raw)
    db.commit()
    logger.info(f"[listing.created] Raw listing saved: {payload.get('listing_id')}")


def handle_listing_updated(payload: dict, db: Session):
    """Update listing status in DB when updated event received."""
    listing_id = payload.get("listing_id")
    if listing_id:
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if listing:
            new_status = payload.get("status")
            if new_status:
                try:
                    listing.status = ListingStatus(new_status)
                    db.commit()
                    logger.info(f"[listing.updated] Status updated for: {listing_id}")
                except Exception as e:
                    logger.error(f"[listing.updated] Failed to update: {e}")


def handle_inquiry_submitted(payload: dict, db: Session, kafka_offset: int, partition: int):
    """Record inquiry analytics event."""
    event = AnalyticsEvent(
        event_type="inquiry.submitted",
        listing_id=payload.get("listing_id"),
        event_metadata=json.dumps(payload),
    )
    db.add(event)
    db.commit()
    logger.info(f"[inquiry.submitted] Analytics recorded: {payload.get('inquiry_id')}")


def handle_pageview(payload: dict, db: Session):
    """Record pageview analytics event."""
    event = AnalyticsEvent(
        event_type="analytics.pageview",
        listing_id=payload.get("listing_id"),
        user_id=payload.get("user_id"),
        event_metadata=json.dumps({"listing_id": payload.get("listing_id")}),
    )
    db.add(event)
    db.commit()


def run_consumer():
    logger.info("Starting Kafka Consumer...")

    schema_registry_client = SchemaRegistryClient({"url": settings.schema_registry_url})

    deserializers = {
        settings.topic_listing_created: get_deserializer(LISTING_CREATED_SCHEMA, schema_registry_client),
        settings.topic_listing_updated: get_deserializer(LISTING_UPDATED_SCHEMA, schema_registry_client),
        settings.topic_inquiry_submitted: get_deserializer(INQUIRY_SUBMITTED_SCHEMA, schema_registry_client),
        settings.topic_analytics_pageview: get_deserializer(ANALYTICS_PAGEVIEW_SCHEMA, schema_registry_client),
    }

    consumer = Consumer({
        "bootstrap.servers": settings.kafka_bootstrap_servers,
        "group.id": "realestate-consumer-group",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": True,
    })

    topics = list(deserializers.keys())
    consumer.subscribe(topics)
    logger.info(f"Subscribed to topics: {topics}")

    db: Session = SessionLocal()

    try:
        while running:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                logger.error(f"Consumer error: {msg.error()}")
                continue

            topic = msg.topic()
            deserializer = deserializers.get(topic)
            if not deserializer:
                continue

            try:
                payload = deserializer(msg.value(), SerializationContext(topic, MessageField.VALUE))
                logger.info(f"Received [{topic}]: {json.dumps(payload, default=str)}")

                if topic == settings.topic_listing_created:
                    handle_listing_created(payload, db, msg.offset(), msg.partition())
                elif topic == settings.topic_listing_updated:
                    handle_listing_updated(payload, db)
                elif topic == settings.topic_inquiry_submitted:
                    handle_inquiry_submitted(payload, db, msg.offset(), msg.partition())
                elif topic == settings.topic_analytics_pageview:
                    handle_pageview(payload, db)

            except Exception as e:
                logger.error(f"Failed to process message from {topic}: {e}")
                db.rollback()

    finally:
        consumer.close()
        db.close()
        logger.info("Consumer shut down cleanly.")


if __name__ == "__main__":
    run_consumer()
