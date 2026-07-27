package com.example.taskmanager.web.dto;

import com.example.taskmanager.domain.model.Task.TaskPriority;
import jakarta.validation.constraints.Size;

/**
 * Inbound DTO for partial task updates. All fields are optional; only
 * non-null fields are applied.
 */
public record UpdateTaskRequest(
        @Size(max = 255, message = "Title must be 255 characters or fewer")
        String title,

        @Size(max = 2000, message = "Description must be 2000 characters or fewer")
        String description,

        TaskPriority priority
) {}
