"""
DAG: enrich_listings
Purpose: Hourly — compute price_per_sqft for listings missing it,
         assign neighborhood_score based on city/state heuristics,
         and update any stale computed fields.
"""
import logging
import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

import psycopg2

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "APP_DATABASE_URL",
    "postgresql://realestate:realestate123@postgres:5432/realestate"
)

default_args = {
    "owner": "data-engineering",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
}

# Simple neighborhood score heuristic (can be replaced with external data source)
CITY_SCORES = {
    "mumbai": 9.2, "bangalore": 8.8, "delhi": 8.5, "hyderabad": 8.3,
    "chennai": 8.1, "pune": 8.0, "gurgaon": 8.4, "noida": 7.9,
    "ahmedabad": 7.5, "kolkata": 7.6, "jaipur": 7.3, "lucknow": 7.0,
    "chandigarh": 7.8, "surat": 7.1, "bhopal": 6.9,
    # Default for unknown cities: 6.5
}


def compute_price_per_sqft():
    """Compute price_per_sqft for listings where area_sqft is available."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE listings
            SET price_per_sqft = ROUND(price / area_sqft, 2)
            WHERE area_sqft IS NOT NULL
              AND area_sqft > 0
              AND (price_per_sqft IS NULL OR price_per_sqft = 0)
        """)
        rows_updated = cur.rowcount
        conn.commit()
        logger.info(f"[EnrichDAG] price_per_sqft computed for {rows_updated} listings")
    finally:
        cur.close()
        conn.close()


def compute_neighborhood_scores():
    """Assign neighborhood scores based on city."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT id, city FROM listings
            WHERE neighborhood_score IS NULL AND status = 'active'
        """)
        rows = cur.fetchall()
        logger.info(f"[EnrichDAG] Enriching {len(rows)} listings with neighborhood scores")

        for listing_id, city in rows:
            score = CITY_SCORES.get((city or "").lower().strip(), 6.5)
            cur.execute("""
                UPDATE listings SET neighborhood_score = %s WHERE id = %s
            """, (score, listing_id))

        conn.commit()
        logger.info(f"[EnrichDAG] Neighborhood scores assigned to {len(rows)} listings")
    finally:
        cur.close()
        conn.close()


def recompute_counters():
    """Recompute view_count and inquiry_count from analytics_events and inquiries tables."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        # Recompute inquiry counts
        cur.execute("""
            UPDATE listings l
            SET inquiry_count = (
                SELECT COUNT(*) FROM inquiries i WHERE i.listing_id = l.id
            )
            WHERE l.status = 'active'
        """)
        conn.commit()
        logger.info("[EnrichDAG] Inquiry counts recomputed.")

        # Recompute view counts from analytics events
        cur.execute("""
            UPDATE listings l
            SET view_count = (
                SELECT COUNT(*) FROM analytics_events ae
                WHERE ae.listing_id = l.id AND ae.event_type = 'analytics.pageview'
            )
            WHERE l.status = 'active'
        """)
        conn.commit()
        logger.info("[EnrichDAG] View counts recomputed.")
    finally:
        cur.close()
        conn.close()


with DAG(
    dag_id="enrich_listings",
    description="Hourly enrichment: price_per_sqft, neighborhood scores, counter recomputation",
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule_interval="0 * * * *",
    catchup=False,
    tags=["data-engineering", "enrichment", "listings"],
) as dag:

    t1 = PythonOperator(
        task_id="compute_price_per_sqft",
        python_callable=compute_price_per_sqft,
    )

    t2 = PythonOperator(
        task_id="compute_neighborhood_scores",
        python_callable=compute_neighborhood_scores,
    )

    t3 = PythonOperator(
        task_id="recompute_counters",
        python_callable=recompute_counters,
    )

    t1 >> t2 >> t3
