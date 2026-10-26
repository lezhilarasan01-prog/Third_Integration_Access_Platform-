/**
 * ===================================================================
 * Central Kafka Infrastructure Configuration
 * ===================================================================
 * Single source of truth for Kafka Broker endpoints across the frontend.
 * 
 * IF A NEW BROKER IP OR CLUSTER IS DEPLOYED:
 *   Change `BOOTSTRAP_SERVERS` below once.
 *   All pages, CLI command templates, terminal windows, and status cards
 *   will automatically reflect the new broker immediately without
 *   hardcoding across individual components.
 * ===================================================================
 */

export const KAFKA_CONFIG = {
  // Primary Broker Endpoint (Host:Port)
  BOOTSTRAP_SERVERS: '15.207.237.212:9092',

  // Security & Authentication Protocol
  SECURITY_PROTOCOL: 'SASL_PLAINTEXT',
  SASL_MECHANISM: 'SCRAM-SHA-512',

  // Default Ingestion Topics & Consumer Groups
  DEFAULT_TOPIC: 'erp_file_po_raw',
  DEFAULT_DLQ_TOPIC: 'erp_file_po_dlq',
  DEFAULT_CONSUMER_GROUP: 'erp-platform-consumer-group',
  CONVERSION_GROUP: 'erp-conversion-group',
  PARTITION_COUNT: 6
};

export default KAFKA_CONFIG;
