package com.example.taskmanager.domain.event;

import com.example.taskmanager.domain.model.Task;

/**
 * Pattern 7 -- Event-Driven Communication.
 *
 * <p>Published when a new task is created. Carries an immutable snapshot of
 * the task's id and title at the moment of creation.</p>
 *
 * <p>Using a Java {@code record} makes the event immutable by construction,
 * which is important because events may be consumed asynchronously on a
 * different thread.</p>
 */
public record TaskCreatedEvent(Long taskId, String title) {

    public static TaskCreatedEvent from(Task task) {
        return new TaskCreatedEvent(task.getId(), task.getTitle());
    }
}
