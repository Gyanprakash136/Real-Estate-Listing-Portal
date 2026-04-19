"""
DAG: stale_listings
Purpose: Daily at 08:00 — flag listings that have had no views
         or updates in 30+ days, and auto-expire those flagged for 7+ days.
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


def flag_stale_listings():
    """
    Flag active listings that haven't been updated in 30 days
    and have fewer than 2 views.
    """
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE listings
            SET
                stale_flagged = TRUE,
                stale_flagged_at = NOW()
            WHERE
                status = 'active'
                AND stale_flagged = FALSE
                AND updated_at < NOW() - INTERVAL '30 days'
                AND view_count < 2
        """)
        flagged = cur.rowcount
        conn.commit()
        logger.info(f"[StaleDAG] Flagged {flagged} listings as stale")
    finally:
        cur.close()
        conn.close()


def expire_stale_listings():
    """
    Auto-expire listings that have been stale-flagged for 7+ days
    without any owner action.
    """
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE listings
            SET status = 'stale'
            WHERE
                stale_flagged = TRUE
                AND stale_flagged_at < NOW() - INTERVAL '7 days'
                AND status = 'active'
        """)
        expired = cur.rowcount
        conn.commit()
        logger.info(f"[StaleDAG] Expired {expired} stale listings (status -> stale)")
    finally:
        cur.close()
        conn.close()


def report_stale_summary():
    """Log summary of stale listing situation."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM listings WHERE stale_flagged = TRUE AND status = 'active'")
        currently_flagged = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM listings WHERE status = 'stale'")
        total_stale = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM listings WHERE status = 'active'")
        total_active = cur.fetchone()[0]

        logger.info("=" * 50)
        logger.info("🏚  STALE LISTINGS REPORT")
        logger.info(f"   Active listings:     {total_active}")
        logger.info(f"   Currently flagged:   {currently_flagged}")
        logger.info(f"   Total stale (status): {total_stale}")
        logger.info("=" * 50)
    finally:
        cur.close()
        conn.close()


with DAG(
    dag_id="stale_listings",
    description="Daily stale listing detection: flags, expires, and reports clutter",
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule_interval="0 8 * * *",
    catchup=False,
    tags=["data-engineering", "data-quality", "listings"],
) as dag:

    t1 = PythonOperator(
        task_id="flag_stale_listings",
        python_callable=flag_stale_listings,
    )

    t2 = PythonOperator(
        task_id="expire_stale_listings",
        python_callable=expire_stale_listings,
    )

    t3 = PythonOperator(
        task_id="report_stale_summary",
        python_callable=report_stale_summary,
    )

    t1 >> t2 >> t3
