# RealEstate.io — High-Performance Property Intelligence Platform
## Enterprise Real Estate Ecosystem with Event-Driven Data Pipelines

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-000?style=for-the-badge&logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Apache Airflow](https://img.shields.io/badge/Apache%20Airflow-017CEE?style=for-the-badge&logo=apacheairflow&logoColor=white)](https://airflow.apache.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**RealEstate.io** is a premium, full-stack real estate marketplace engineered for high-scale property management and market intelligence. It bridges the gap between traditional real estate transactions and modern data science by implementing a robust, event-driven architecture and automated analytical workflows.

---

## 🏗️ System Architecture

The platform is built on a distributed microservices pattern, prioritizing high availability, data consistency, and low-latency communication.

```mermaid
graph TD
    subgraph "Client Layer (Vercel)"
        SPA[React 18 SPA]
    end

    subgraph "API & Event Ingress (Render)"
        API[FastAPI Gateway]
        K_PROD[Kafka Producer]
    end

    subgraph "Message Bus (Event Backbone)"
        K_BUS[Apache Kafka Cluster]
        S_REG[Avro Schema Registry]
    end

    subgraph "Asynchronous Workers"
        K_CONS[Python Kafka Consumer]
    end

    subgraph "Data Orchestration (Airflow)"
        D_DED[Deduplication DAG]
        D_ENR[Enrichment DAG]
        D_ANL[Analytics Rollup DAG]
    end

    subgraph "Persistence & Intelligence"
        DB[(PostgreSQL 15)]
        ML_EXP[ML Data Export]
    end

    SPA <--> API
    API --> K_PROD
    K_PROD --> K_BUS
    K_BUS --> K_CONS
    K_CONS --> DB
    DB <--> Airflow
    Airflow --> D_DED
    Airflow --> D_ENR
    Airflow --> D_ANL
    DB --> ML_EXP
```

---

## 📊 Database Entity-Relationship (ER) Schema

The OLTP database is designed in PostgreSQL to handle high-concurrency transactions, user messaging, and raw data ingestion.

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR email
        VARCHAR password_hash
        ENUM role
        VARCHAR full_name
        BOOLEAN is_active
    }
    
    raw_listings {
        UUID id PK
        VARCHAR kafka_topic
        JSONB payload
        BOOLEAN processed
    }

    listings {
        UUID id PK
        UUID client_id FK
        VARCHAR title
        NUMERIC price
        ENUM property_type
        ENUM status
    }

    inquiries {
        UUID id PK
        UUID listing_id FK
        UUID customer_id FK
        TEXT message
        ENUM status
    }
    
    chat_rooms {
        UUID id PK
        UUID listing_id FK
        BOOLEAN is_active
    }

    chat_messages {
        UUID id PK
        UUID room_id FK
        UUID sender_id FK
        TEXT content
    }

    %% Relationships
    users ||--o{ listings : "creates"
    raw_listings ||--o| listings : "populates"
    users ||--o{ inquiries : "submits"
    listings ||--o{ inquiries : "receives"
    users ||--o{ chat_rooms : "participates in"
    listings ||--o{ chat_rooms : "associated with"
    chat_rooms ||--o{ chat_messages : "contains"
    users ||--o{ chat_messages : "sends"
```

---

## 🧬 Data Engineering Foundations

This project serves as a showcase for core **Data Engineering (DE)** principles applied to a real-world production environment. It successfully implements **18 out of 30 Advanced Data Engineering concepts**, intentionally trading legacy Big Data tools (Hadoop) for a **Modern Data Stack**.

### 1. Event-Driven Architecture (EDA) & Streaming
Instead of direct database writes for critical actions, the system utilizes **Apache Kafka** as a central nervous system. Every listing creation or inquiry is emitted as a structured **Avro event** validated by a **Confluent Schema Registry**, ensuring decoupled systems and strict data quality.

### 2. Scalable Orchestration & ETL
Leveraging **Apache Airflow**, the system manages complex dependencies through directed acyclic graphs (DAGs). 
- **ETL Pipelines**: Extracts data from Postgres, transforms it via external logic, and loads it back.
- **Enrichment**: Hourly tasks compute architectural metrics (Price/Sqft) and neighborhood health scores.

### 3. Data Ingestion & Idempotency
The system supports **Bulk CSV Ingestion** via the Admin dashboard. To prevent duplicate listings, the pipeline utilizes cryptographic fingerprinting (SHA-256) of property attributes to ensure that raw ingestion data is sanitized and unique before being promoted to the public marketplace.

### 4. Cloud Infrastructure & Networking
The platform is fully containerized using **Docker** and deployed across modern cloud providers. The React frontend is served via a global CDN on **Vercel**, while the FastAPI backend and PostgreSQL database are hosted on **Render**, communicating over secure internal networks.

---

## 💎 Premium Features

- **Real-Time Communication**: Secure, authenticated chat system for direct owner-to-buyer negotiation.
- **Geospatial Intelligence**: Interactive map integration with cluster rendering and property-specific overlays.
- **Glassmorphism UI**: A state-of-the-art interface designed for professional use, featuring refined dark/light modes and fluid transitions.
- **Admin Command Center**: Advanced management suite for verification, bulk ingestion, and data extraction.

---

## 🚀 Deployment

The entire ecosystem is containerized for seamless scaling and reproducible environments.

### Local Development (Docker Compose)
```bash
# Start the full infrastructure (Postgres, Kafka, Zookeeper, Airflow, Backend, Frontend)
docker-compose up -d --build
```

### Production Cloud Deployment
- **Frontend**: Deployed as a Static Site on Vercel (`vercel.json` configured for SPA routing).
- **Backend**: Deployed as a Dockerized Web Service on Render.
- **Database**: Managed PostgreSQL instance on Render.

---

## 📈 Platform Lifecycle
`Raw Event` → `Kafka Buffer` → `Validation` → `Deduplication` → `Market Enrichment` → `Live Transaction` → `BI Rollup` → `ML Training`
