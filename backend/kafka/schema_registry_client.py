"""
Schema Registry Client — registers Avro schemas with Confluent Schema Registry
"""
import json
import logging
import requests
from config import settings
from kafka.schemas.avro_schemas import (
    LISTING_CREATED_SCHEMA,
    LISTING_UPDATED_SCHEMA,
    INQUIRY_SUBMITTED_SCHEMA,
    ANALYTICS_PAGEVIEW_SCHEMA,
)

logger = logging.getLogger(__name__)

SCHEMAS_TO_REGISTER = {
    f"{settings.topic_listing_created}-value": LISTING_CREATED_SCHEMA,
    f"{settings.topic_listing_updated}-value": LISTING_UPDATED_SCHEMA,
    f"{settings.topic_inquiry_submitted}-value": INQUIRY_SUBMITTED_SCHEMA,
    f"{settings.topic_analytics_pageview}-value": ANALYTICS_PAGEVIEW_SCHEMA,
}


def register_schema(subject: str, schema: dict) -> int:
    """Register or update a schema for a subject. Returns schema ID."""
    url = f"{settings.schema_registry_url}/subjects/{subject}/versions"
    payload = {"schema": json.dumps(schema), "schemaType": "AVRO"}
    response = requests.post(url, json=payload, timeout=10)
    if response.status_code in (200, 201):
        schema_id = response.json().get("id")
        logger.info(f"Registered schema '{subject}' with ID {schema_id}")
        return schema_id
    else:
        raise RuntimeError(f"Schema registration failed for {subject}: {response.text}")


def register_schemas():
    """Register all Avro schemas on application startup."""
    logger.info("Registering Kafka Avro schemas with Schema Registry...")
    for subject, schema in SCHEMAS_TO_REGISTER.items():
        try:
            register_schema(subject, schema)
        except Exception as e:
            logger.warning(f"Could not register schema {subject}: {e}")
    logger.info("Schema registration complete.")


def get_schema_id(subject: str) -> int:
    """Retrieve the latest schema ID for a subject."""
    url = f"{settings.schema_registry_url}/subjects/{subject}/versions/latest"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json().get("id")
