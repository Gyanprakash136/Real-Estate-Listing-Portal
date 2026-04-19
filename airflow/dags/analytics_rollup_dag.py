"""
DAG: analytics_rollup
Purpose: Daily at 02:00 — aggregate analytics_events into analytics_daily
         for efficient reporting (views, inquiries, unique visitors per listing).
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
    "retry_delay": timedelta(minutes=10),
    "email_on_failure": False,
}


def rollup_yesterday_analytics(**context):
    """
    Aggregate analytics_events for yesterday into analytics_daily table.
    Uses UPSERT to handle re-runs safely.
    """
    execution_date = context["execution_date"]
    target_date = (execution_date - timedelta(days=1)).date()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        logger.info(f"[AnalyticsRollup] Rolling up data for date: {target_date}")

        # Rollup page views per listing
        cur.execute("""
            INSERT INTO analytics_daily (report_date, listing_id, views, inquiries, unique_visitors)
            SELECT
                %s AS report_date,
                ae.listing_id,
                COUNT(CASE WHEN ae.event_type = 'analytics.pageview' THEN 1 END) AS views,
                COUNT(CASE WHEN ae.event_type = 'inquiry.submitted' THEN 1 END) AS inquiries,
                COUNT(DISTINCT ae.user_id) AS unique_visitors
            FROM analytics_events ae
            WHERE DATE(ae.created_at) = %s
              AND ae.listing_id IS NOT NULL
            GROUP BY ae.listing_id
            ON CONFLICT (report_date, listing_id)
            DO UPDATE SET
                views = EXCLUDED.views,
                inquiries = EXCLUDED.inquiries,
                unique_visitors = EXCLUDED.unique_visitors
        """, (target_date, target_date))

        rows = cur.rowcount
        conn.commit()
        logger.info(f"[AnalyticsRollup] Upserted {rows} analytics_daily records for {target_date}")

    except Exception as e:
        conn.rollback()
        logger.error(f"[AnalyticsRollup] Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def cleanup_old_events():
    """
    Delete raw analytics events older than 90 days to prevent table bloat.
    Rolled-up data is preserved in analytics_daily.
    """
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("""
            DELETE FROM analytics_events
            WHERE created_at < NOW() - INTERVAL '90 days'
        """)
        deleted = cur.rowcount
        conn.commit()
        logger.info(f"[AnalyticsRollup] Purged {deleted} old analytics events (>90 days)")
    finally:
        cur.close()
        conn.close()


def generate_summary_report():
    """Log a summary of current platform analytics."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) FROM listings WHERE status = 'active'")
        active_listings = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'client'")
        total_clients = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'customer'")
        total_customers = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM inquiries WHERE created_at > NOW() - INTERVAL '24 hours'")
        inquiries_24h = cur.fetchone()[0]

        cur.execute("SELECT SUM(views) FROM analytics_daily WHERE report_date = CURRENT_DATE - 1")
        views_yesterday = cur.fetchone()[0] or 0

        # NEW: Sales metrics
        cur.execute("SELECT COUNT(*) FROM listings WHERE status = 'sold' AND sold_at > NOW() - INTERVAL '24 hours'")
        sold_24h = cur.fetchone()[0]

        cur.execute("SELECT AVG(sold_price) FROM listings WHERE status = 'sold' AND sold_at > NOW() - INTERVAL '24 hours'")
        avg_sold_price = cur.fetchone()[0] or 0

        cur.execute("""
            SELECT AVG(price - sold_price) 
            FROM listings 
            WHERE status = 'sold' 
              AND sold_at > NOW() - INTERVAL '24 hours'
              AND price IS NOT NULL AND sold_price IS NOT NULL
        """)
        avg_price_delta = cur.fetchone()[0] or 0

        logger.info("=" * 50)
        logger.info("📊 DAILY ANALYTICS SUMMARY")
        logger.info(f"   Active listings:        {active_listings}")
        logger.info(f"   Total clients:          {total_clients}")
        logger.info(f"   Total customers:        {total_customers}")
        logger.info(f"   Inquiries (24h):        {inquiries_24h}")
        logger.info(f"   Page views (yesterday): {views_yesterday}")
        logger.info(f"   Properties Sold (24h):  {sold_24h}")
        logger.info(f"   Avg Sold Price (24h):   ₹{float(avg_sold_price):,.2f}")
        logger.info(f"   Avg Negotiated Delta:   ₹{float(avg_price_delta):,.2f}")
        logger.info("=" * 50)

    finally:
        cur.close()
        conn.close()


with DAG(
    dag_id="analytics_rollup",
    description="Daily analytics rollup: aggregates events into analytics_daily, cleans old data",
    default_args=default_args,
    start_date=datetime(2024, 1, 1),
    schedule_interval="0 2 * * *",
    catchup=False,
    tags=["data-engineering", "analytics"],
) as dag:

    t1 = PythonOperator(
        task_id="rollup_yesterday_analytics",
        python_callable=rollup_yesterday_analytics,
        provide_context=True,
    )

    t2 = PythonOperator(
        task_id="cleanup_old_events",
        python_callable=cleanup_old_events,
    )

    t3 = PythonOperator(
        task_id="generate_summary_report",
        python_callable=generate_summary_report,
    )

    t1 >> t2 >> t3
