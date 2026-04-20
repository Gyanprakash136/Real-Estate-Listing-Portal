"""
Kafka Producer — publishes Avro-serialized events to Kafka topics
"""
import json
import uuid
import logging
from datetime import datetime, timezone
from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import SerializationContext, MessageField

from config import settings
from kafka.schemas.avro_schemas import (
    LISTING_CREATED_SCHEMA,
    LISTING_UPDATED_SCHEMA,
    INQUIRY_SUBMITTED_SCHEMA,
    ANALYTICS_PAGEVIEW_SCHEMA,
)

logger = logging.getLogger(__name__)


def _schema_str(schema_dict: dict) -> str:
    return json.dumps(schema_dict)


class KafkaProducer:
    def __init__(self):
        self._producer = None
        self._schema_registry = None
        self._serializers = {}

    def _get_producer(self):
        if self._producer is None:
            try:
                self._producer = Producer({
                    "bootstrap.servers": settings.kafka_bootstrap_servers,
                    "client.id": "realestate-backend",
                    "acks": "all",
                    "retries": 3,
                })
                logger.info("Kafka producer initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Kafka producer: {e}")
                raise
        return self._producer

    def _get_schema_registry(self):
        if self._schema_registry is None:
            try:
                self._schema_registry = SchemaRegistryClient({
                    "url": settings.schema_registry_url
                })
            except Exception as e:
                logger.error(f"Failed to connect to Schema Registry: {e}")
                raise
        return self._schema_registry

    def _get_serializer(self, topic: str, schema_dict: dict) -> AvroSerializer:
        if topic not in self._serializers:
            sr = self._get_schema_registry()
            self._serializers[topic] = AvroSerializer(
                sr,
                _schema_str(schema_dict),
            )
        return self._serializers[topic]

    def _delivery_report(self, err, msg):
        if err is not None:
            logger.error(f"Delivery failed for topic {msg.topic()}: {err}")
        else:
            logger.info(f"Message delivered to {msg.topic()} [{msg.partition()}] @ offset {msg.offset()}")

    def _publish(self, topic: str, schema_dict: dict, data: dict, key: str = None):
        logger.warning(f"Kafka is disabled. Skipping message to {topic}")
        return
        try:
            producer = self._get_producer()
            serializer = self._get_serializer(topic, schema_dict)
            serialized = serializer(data, SerializationContext(topic, MessageField.VALUE))
            producer.produce(
                topic=topic,
                value=serialized,
                key=key,
                on_delivery=self._delivery_report,
            )
            producer.poll(0)
        except Exception as e:
            logger.error(f"Failed to publish to {topic}: {e}")
            raise

    def publish_listing_created(self, listing, user):
        data = {
            "event_id": str(uuid.uuid4()),
            "event_type": "listing.created",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "listing_id": str(listing.id),
            "client_id": str(listing.client_id),
            "client_name": user.full_name,
            "title": listing.title,
            "price": float(listing.price),
            "property_type": listing.property_type.value,
            "city": listing.city,
            "state": listing.state,
            "address": listing.address,
            "latitude": float(listing.latitude) if listing.latitude else None,
            "longitude": float(listing.longitude) if listing.longitude else None,
            "fingerprint": listing.fingerprint or "",
        }
        self._publish(settings.topic_listing_created, LISTING_CREATED_SCHEMA, data, key=str(listing.id))

    def publish_listing_updated(self, listing):
        data = {
            "event_id": str(uuid.uuid4()),
            "event_type": "listing.updated",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "listing_id": str(listing.id),
            "client_id": str(listing.client_id),
            "title": listing.title,
            "price": float(listing.price),
            "status": listing.status.value,
        }
        self._publish(settings.topic_listing_updated, LISTING_UPDATED_SCHEMA, data, key=str(listing.id))

    def publish_inquiry_submitted(self, inquiry, customer, listing):
        data = {
            "event_id": str(uuid.uuid4()),
            "event_type": "inquiry.submitted",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inquiry_id": str(inquiry.id),
            "listing_id": str(inquiry.listing_id),
            "listing_title": listing.title,
            "customer_id": str(customer.id),
            "customer_name": customer.full_name,
            "contact_email": inquiry.contact_email,
        }
        self._publish(settings.topic_inquiry_submitted, INQUIRY_SUBMITTED_SCHEMA, data, key=str(inquiry.listing_id))

    def publish_pageview(self, listing_id: str, user_id: str = None):
        data = {
            "event_id": str(uuid.uuid4()),
            "event_type": "analytics.pageview",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "listing_id": listing_id,
            "user_id": user_id,
        }
        self._publish(settings.topic_analytics_pageview, ANALYTICS_PAGEVIEW_SCHEMA, data, key=listing_id)

    def flush(self):
        if self._producer:
            self._producer.flush()


# Singleton instance
kafka_producer = KafkaProducer()
