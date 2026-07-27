package com.example.taskmanager.web.dto;

import com.example.taskmanager.domain.model.Task.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Inbound DTO for task creation. Using a Java {@code record} gives us
 * immutability, a compact declaration, and automatic {@code equals}/
 * {@code hashCode}/{@code toString}.
 */
public record CreateTaskRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 255, message = "Title must be 255 characters or fewer")
        String title,

        @Size(max = 2000, message = "Description must be 2000 characters or fewer")
        String description,

        TaskPriority priority
) {}
