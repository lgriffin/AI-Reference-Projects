package com.example.taskboard.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Configuration: typed and validated at start-up. application.yml maps the environment onto it. */
@Validated
@ConfigurationProperties("app")
public record AppProperties(@Min(1) int wipLimit) {}
