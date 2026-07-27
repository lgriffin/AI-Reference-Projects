package com.example.taskmanager.web.dto;

import com.example.taskmanager.domain.model.Task.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeStatusRequest(
        @NotNull(message = "Status is required")
        TaskStatus status
) {}
