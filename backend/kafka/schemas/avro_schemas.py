"""
Avro schema for listing.created topic
"""
LISTING_CREATED_SCHEMA = {
    "type": "record",
    "name": "ListingCreated",
    "namespace": "com.realestate.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_type", "type": "string", "default": "listing.created"},
        {"name": "timestamp", "type": "string"},
        {"name": "listing_id", "type": "string"},
        {"name": "client_id", "type": "string"},
        {"name": "client_name", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "price", "type": "double"},
        {"name": "property_type", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "state", "type": "string"},
        {"name": "address", "type": "string"},
        {"name": "latitude", "type": ["null", "double"], "default": None},
        {"name": "longitude", "type": ["null", "double"], "default": None},
        {"name": "fingerprint", "type": "string"}
    ]
}

LISTING_UPDATED_SCHEMA = {
    "type": "record",
    "name": "ListingUpdated",
    "namespace": "com.realestate.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_type", "type": "string", "default": "listing.updated"},
        {"name": "timestamp", "type": "string"},
        {"name": "listing_id", "type": "string"},
        {"name": "client_id", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "price", "type": "double"},
        {"name": "status", "type": "string"}
    ]
}

INQUIRY_SUBMITTED_SCHEMA = {
    "type": "record",
    "name": "InquirySubmitted",
    "namespace": "com.realestate.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_type", "type": "string", "default": "inquiry.submitted"},
        {"name": "timestamp", "type": "string"},
        {"name": "inquiry_id", "type": "string"},
        {"name": "listing_id", "type": "string"},
        {"name": "listing_title", "type": "string"},
        {"name": "customer_id", "type": "string"},
        {"name": "customer_name", "type": "string"},
        {"name": "contact_email", "type": "string"}
    ]
}

ANALYTICS_PAGEVIEW_SCHEMA = {
    "type": "record",
    "name": "AnalyticsPageview",
    "namespace": "com.realestate.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_type", "type": "string", "default": "analytics.pageview"},
        {"name": "timestamp", "type": "string"},
        {"name": "listing_id", "type": "string"},
        {"name": "user_id", "type": ["null", "string"], "default": None}
    ]
}
