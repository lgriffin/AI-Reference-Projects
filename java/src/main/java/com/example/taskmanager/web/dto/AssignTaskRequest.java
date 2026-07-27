package com.example.taskmanager.web.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Inbound DTO for assigning a user to a task.
 */
public record AssignTaskRequest(
        @NotNull(message = "userId is required")
        Long userId
) {}
