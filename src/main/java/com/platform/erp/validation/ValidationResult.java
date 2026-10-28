package com.platform.erp.validation;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Result of schema validation containing any validation errors encountered.
 */
public record ValidationResult(
        boolean isValid,
        List<ValidationError> errors
) {
    public ValidationResult {
        if (errors == null) {
            errors = Collections.emptyList();
        }
    }

    public static ValidationResult valid() {
        return new ValidationResult(true, Collections.emptyList());
    }

    public static ValidationResult invalid(List<ValidationError> errors) {
        return new ValidationResult(false, errors);
    }

    public static ValidationResult of(List<ValidationError> errors) {
        return (errors == null || errors.isEmpty()) ? valid() : invalid(errors);
    }

    public String getFormattedErrors() {
        if (isValid || errors.isEmpty()) {
            return "No validation errors";
        }
        return errors.stream()
                .map(e -> String.format("[%s]: %s (value: '%s')", e.field(), e.message(), e.rejectedValue()))
                .collect(Collectors.joining("; "));
    }
}
