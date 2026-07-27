package com.example.taskmanager.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Pattern 5 -- Configuration Externalisation.
 *
 * <p>Type-safe, validated configuration bound from {@code application.yml} under
 * the {@code app} prefix. Jakarta Bean Validation constraints are enforced at
 * startup; the application refuses to start if a constraint is violated.</p>
 *
 * <p>Because this is a {@code record}, it is immutable after construction --
 * a property that pairs well with externalised configuration, where values
 * should be fixed for the lifetime of the application context.</p>
 */
@Validated
@ConfigurationProperties(prefix = "app")
public record AppConfig(
        @NotBlank String name,
        @Min(1) @Max(100) int defaultPageSize,
        TaskDefaults taskDefaults
) {
    /**
     * Nested configuration for task-specific defaults.
     */
    public record TaskDefaults(
            @NotBlank String defaultPriority,
            @Min(1) @Max(365) int dueDateDaysFromNow
    ) {}
}
