package com.platform.erp.validation;

/**
 * Represents a single schema validation violation.
 */
public record ValidationError(
        String field,
        String message,
        Object rejectedValue
) {
    public ValidationError(String field, String message) {
        this(field, message, null);
    }
}

