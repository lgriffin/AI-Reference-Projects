package com.example.taskmanager.domain.event;

import com.example.taskmanager.domain.model.Task;
import java.time.Instant;

/**
 * Published when a task transitions to the {@code COMPLETED} status.
 */
public record TaskCompletedEvent(Long taskId, String title, Instant completedAt) {

    public static TaskCompletedEvent from(Task task) {
        return new TaskCompletedEvent(task.getId(), task.getTitle(), task.getCompletedAt());
    }
}
