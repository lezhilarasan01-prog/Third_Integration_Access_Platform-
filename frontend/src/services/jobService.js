/**
 * MAWM Connect — Integration Job Service
 *
 * Provides a decoupled data access layer for integration jobs, timeline stages,
 * and validation error diagnostics.
 * When a real PostgreSQL or Spring Boot REST backend is connected,
 * this service can be updated to fetch from `/api/v1/jobs` without modifying UI components.
 */

import { recentJobs, kpiSummary } from '../data/mockData.js';

/**
 * Known business validation rules and their suggested corrective actions.
 * Sourced directly from com.platform.mawm.validation.BusinessRuleRecordValidator.
 */
const VALIDATION_CORRECTIONS = {
  MISSING_WAREHOUSE: "Provide a valid warehouse facility identifier (e.g., 'WH-1', 'DC-01') in the inbound record or map an equivalent ERP column.",
  INVALID_QUANTITY_VALUE: "Update the quantity field to a positive integer value strictly greater than zero (> 0).",
  MISSING_QUANTITY: "Populate the required numeric line-item quantity in the inbound payload.",
  MISSING_SKU: "Specify a valid non-empty item or SKU identifier string in the source record.",
  MISSING_PO_NUMBER: "Ensure the purchase order number (PO number) is populated in the feed or header mapping.",
  MISSING_ASN_NUMBER: "Ensure the advance shipment notice reference identifier (ASN number) is populated.",
  INVALID_NUMERIC_FIELD: "Correct the field value to a valid numeric format without letters or special characters.",
  EMPTY_PAYLOAD: "Ensure the inbound file contains valid line item records before submitting for conversion.",
  MISSING_SOURCE_SYSTEM: "Configure the sending source system identifier (e.g., CUSTOMER_A_ERP, SAP_ERP) in the intake envelope.",
  NULL_RECORD: "Ensure the record envelope payload is not empty or null.",
};

/**
 * Retrieve all jobs with optional client-side filtering.
 */
export function getAllJobs() {
  return recentJobs;
}

/**
 * Retrieve a single integration job by its unique UUID.
 * Returns null if no job matches the given ID.
 *
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getJobById(jobId) {
  if (!jobId) return null;
  const normalizedId = String(jobId).trim().toLowerCase();
  return recentJobs.find((j) => String(j.jobId).trim().toLowerCase() === normalizedId) || null;
}

/**
 * Calculate processing duration in milliseconds from createdAt and updatedAt ISO timestamps.
 * Returns formatted duration string (e.g., "32 ms" or "1.25 s") or null if not supported.
 *
 * @param {string} createdAt
 * @param {string} updatedAt
 * @returns {string|null}
 */
export function calculateDuration(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;

  const diffMs = end - start;
  if (diffMs < 1000) {
    return `${diffMs} ms`;
  }
  return `${(diffMs / 1000).toFixed(2)} s`;
}

/**
 * Retrieve suggested corrective action for a validation error.
 * Only returns a suggestion when supported by the validation business rule.
 *
 * @param {Object} error
 * @returns {string|null}
 */
export function getSuggestedCorrection(error) {
  if (!error) return null;
  if (error.errorCode && VALIDATION_CORRECTIONS[error.errorCode]) {
    return VALIDATION_CORRECTIONS[error.errorCode];
  }
  // Check by field name fallback if code is generic
  if (error.field) {
    const fieldLower = String(error.field).toLowerCase();
    if (fieldLower.includes('warehouse')) return VALIDATION_CORRECTIONS.MISSING_WAREHOUSE;
    if (fieldLower.includes('sku') || fieldLower.includes('item')) return VALIDATION_CORRECTIONS.MISSING_SKU;
    if (fieldLower.includes('qty') || fieldLower.includes('quantity')) return VALIDATION_CORRECTIONS.INVALID_QUANTITY_VALUE;
  }
  return null;
}

/**
 * Generate the 6-stage lifecycle timeline for a specific integration job.
 * Accurately represents stages using existing job data, and marks MAWM delivery
 * as Not Connected / Not Implemented.
 *
 * @param {Object} job
 * @returns {Array}
 */
export function getJobTimeline(job) {
  if (!job) return [];

  const isFailed = job.status === 'FAILED';
  const hasErrors = (job.errorRecords || 0) > 0;
  const isCompleted = job.status === 'COMPLETED';

  return [
    {
      id: 'received',
      name: 'Job Received',
      stageNumber: 1,
      status: 'completed',
      timestamp: job.createdAt,
      summary: `Inbound ${job.inputFormat} file received from ${job.sourceSystem}`,
      details: `File reference: ${job.originalFilename || 'inbound_file'}. Raw bytes captured in local intake buffer.`,
    },
    {
      id: 'parsing',
      name: 'Parsing',
      stageNumber: 2,
      status: isFailed && job.totalRecords === 0 ? 'failed' : 'completed',
      timestamp: job.createdAt,
      summary:
        isFailed && job.totalRecords === 0
          ? 'Failed to parse raw input feed'
          : `Parsed ${job.totalRecords} record(s) from ${job.inputFormat} format`,
      details:
        isFailed && job.totalRecords === 0
          ? 'File parser encountered fatal syntax or schema mismatch during initial ingestion.'
          : `Feed structure parsed into intermediate row models successfully.`,
    },
    {
      id: 'validation',
      name: 'Validation',
      stageNumber: 3,
      status: isFailed ? 'failed' : hasErrors ? 'warning' : 'completed',
      timestamp: job.updatedAt || job.createdAt,
      summary: hasErrors
        ? `${job.errorRecords} validation exception(s) detected`
        : isFailed
        ? 'Validation aborted due to parser failure'
        : `All ${job.totalRecords} record(s) validated successfully`,
      details: hasErrors
        ? `${job.errorRecords} invalid row(s) isolated and routed to dead-letter storage.`
        : isFailed
        ? 'Business rule validator could not execute due to preceding failure.'
        : `All records satisfied business constraints (valid warehouse, SKU, and positive quantity).`,
    },
    {
      id: 'transformation',
      name: 'JSON Transformation',
      stageNumber: 4,
      status:
        job.convertedRecords > 0
          ? 'completed'
          : isFailed
          ? 'skipped'
          : 'halted',
      timestamp: job.convertedRecords > 0 ? job.updatedAt : null,
      summary:
        job.convertedRecords > 0
          ? `Transformed ${job.convertedRecords} canonical JSON record(s)`
          : 'Transformation halted (0 valid records)',
      details:
        job.convertedRecords > 0
          ? `Applied mapping profile '${job.mappingProfile}' to normalize ERP structures into MAWM canonical format.`
          : 'No valid records available for canonical transformation.',
    },
    {
      id: 'output',
      name: 'Output Generated',
      stageNumber: 5,
      status:
        job.convertedRecords > 0
          ? 'completed'
          : job.errorFile
          ? 'warning'
          : 'skipped',
      timestamp: job.updatedAt || null,
      summary:
        job.convertedRecords > 0
          ? 'Canonical JSONL artifacts written'
          : job.errorFile
          ? 'Error diagnostic artifact written'
          : 'No output artifacts generated',
      details:
        job.convertedRecords > 0
          ? `Generated envelope files staged at data/output/${job.jobId}/`
          : job.errorFile
          ? `Diagnostic error log generated at ${job.errorFile}`
          : 'Execution concluded with no output files written.',
    },
    {
      id: 'delivery',
      name: 'MAWM Delivery',
      stageNumber: 6,
      status: 'not_connected', // Explicitly marked as not connected
      timestamp: null,
      summary: 'Not Connected / Not Implemented',
      details:
        'Live MAWM REST API delivery is not connected in this demonstration phase. Canonical records remain staged locally for downstream dispatchers.',
    },
  ];
}
