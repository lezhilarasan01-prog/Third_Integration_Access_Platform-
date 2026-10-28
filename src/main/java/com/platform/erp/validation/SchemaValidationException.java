package com.platform.erp.validation;

/**
 * Exception thrown when an incoming message fails schema validation rules.
 */
public class SchemaValidationException extends IllegalStateException {

    private final ValidationResult validationResult;

    public SchemaValidationException(String message, ValidationResult validationResult) {
        super(message + (validationResult != null ? ": " + validationResult.getFormattedErrors() : ""));
        this.validationResult = validationResult;
    }

    public ValidationResult getValidationResult() {
        return validationResult;
    }
}
