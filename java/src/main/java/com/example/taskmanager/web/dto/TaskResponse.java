package com.example.taskmanager.web.dto;

import com.example.taskmanager.domain.model.Task;

import java.time.Instant;

/**
 * Outbound DTO that shields the internal domain model from API consumers.
 * The static factory method {@link #from(Task)} performs the mapping in
 * a single place.
 */
public record TaskResponse(
        Long id,
        String title,
        String description,
        String status,
        String priority,
        Long assigneeId,
        String assigneeName,
        Instant createdAt,
        Instant completedAt
) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus().name(),
                task.getPriority().name(),
                task.getAssignee() != null ? task.getAssignee().getId() : null,
                task.getAssignee() != null ? task.getAssignee().getName() : null,
                task.getCreatedAt(),
                task.getCompletedAt()
        );
    }
}
