"""
DAG: dedupe_listings
Purpose: Every 15 minutes, scan raw_listings table for unprocessed events,
         compute a fingerprint (address + price), detect duplicates,
         and promote unique listings to the clean listings table with status=active.
"""
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone

from airflow import DAG
from airflow.operators.python import PythonOperator

import psycopg2
import os

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "APP_DATABASE_URL",
    "postgresql://realestate:realestate123@postgres:5432/realestate"
)

default_args = {
    "owner": "data-engineering",
    "retries": 2,
    "retry_delay": timedelta(minutes=2),
    "email_on_failure": False,
}


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def deduplicate_and_promote():
    """
    1. Fetch all unprocessed raw_listings
    2. Group by fingerprint (sha256 of normalized address + price)
    3. For each unique fingerprint: promote to listings table if not already present
    4. Mark raw_listings as processed
    """
    conn = get_conn()
    cur = conn.cursor()
    promoted = 0
    skipped = 0
    errors = 0

    try:
        # Fetch unprocessed raw listings
        cur.execute("""
            SELECT id, payload, kafka_offset, kafka_partition
            FROM raw_listings
            WHERE processed = FALSE
            ORDER BY received_at ASC
            LIMIT 500
        """)
        rows = cur.fetchall()
        logger.info(f"[DedupeDAG] Found {len(rows)} unprocessed raw listings")

        seen_fingerprints = set()

        for row in rows:
            raw_id, payload, offset, partition = row
            try:
                if isinstance(payload, str):
                    payload = json.loads(payload)

                listing_id = payload.get("listing_id")
                address = (payload.get("address") or "").lower().strip()
                price = float(payload.get("price") or 0)
                fingerprint = hashlib.sha256(f"{address}:{price}".encode()).hexdigest()

                # Check if this listing already exists in listings table
                cur.execute("SELECT id, status FROM listings WHERE id = %s", (listing_id,))
                existing = cur.fetchone()

                # Check for global fingerprint collision (different listing, same address+price)
                # We check against any listing that isn't withdrawn and has a different ID
                cur.execute("""
                    SELECT id FROM listings
                    WHERE fingerprint = %s AND id != %s AND status != 'withdrawn'
                    LIMIT 1
                """, (fingerprint, listing_id))
                global_collision = cur.fetchone()

                if global_collision:
                    # Duplicate found — mark this listing as withdrawn and raw as processed
                    if existing:
                        cur.execute("""
                            UPDATE listings SET
                                fingerprint = %s,
                                status = 'withdrawn',
                                deduped_at = NOW()
                            WHERE id = %s
                        """, (fingerprint, listing_id))
                    
                    cur.execute("""
                        UPDATE raw_listings SET
                            processed = TRUE,
                            processed_at = NOW(),
                            error_msg = 'Global duplicate: fingerprint collision'
                        WHERE id = %s
                    """, (raw_id,))
                    skipped += 1
                    logger.warning(f"[DedupeDAG] Global duplicate for listing {listing_id} (collision with {global_collision[0]})")

                elif fingerprint in seen_fingerprints:
                    # Duplicate within this batch — skip/withdraw
                    if existing:
                        cur.execute("""
                            UPDATE listings SET
                                fingerprint = %s,
                                status = 'withdrawn',
                                deduped_at = NOW()
                            WHERE id = %s
                        """, (fingerprint, listing_id))

                    cur.execute("""
                        UPDATE raw_listings SET
                            processed = TRUE,
                            processed_at = NOW(),
                            error_msg = 'Duplicate within batch'
                        WHERE id = %s
                    """, (raw_id,))
                    skipped += 1
                    logger.warning(f"[DedupeDAG] Intra-batch duplicate for listing {listing_id}")

                else:
                    # Unique: Update fingerprint and keep it pending for admin verification
                    if existing:
                        cur.execute("""
                            UPDATE listings SET
                                fingerprint = %s,
                                deduped_at = NOW(),
                                status = 'pending'
                            WHERE id = %s
                        """, (fingerprint, listing_id))
                    else:
                        # This case shouldn't happen if API pre-inserts, but good for robustness
                        logger.warning(f"[DedupeDAG] Listing {listing_id} not found in DB during promotion")

                    cur.execute("""
                        UPDATE raw_listings SET
                            processed = TRUE,
                            processed_at = NOW()
                        WHERE id = %s
                    """, (raw_id,))

                    seen_fingerprints.add(fingerprint)
                    promoted += 1
                    logger.info(f"[DedupeDAG] Promoted listing {listing_id}")

            except Exception as e:
                logger.error(f"[DedupeDAG] Error processing raw_id {raw_id}: {e}")
                cur.execute("""
                    UPDATE raw_listings SET error_msg = %s WHERE id = %s
                """, (str(e), raw_id))
                errors += 1

        conn.commit()
        logger.info(f"[DedupeDAG] Done: promoted={promoted}, skipped={skipped}, errors={errors}")

    except Exception as e:
        conn.rollback()
        logger.error(f"[DedupeDAG] Fatal error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


with DAG(
    dag_id="dedupe_listings",
    description="Deduplicates raw Kafka listings and promotes them to active status",
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule_interval="*/15 * * * *",
    catchup=False,
    tags=["data-engineering", "deduplication", "listings"],
) as dag:

    dedupe_task = PythonOperator(
        task_id="deduplicate_and_promote_listings",
        python_callable=deduplicate_and_promote,
    )
