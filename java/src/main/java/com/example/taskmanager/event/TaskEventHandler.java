package com.example.taskmanager.event;

import com.example.taskmanager.domain.event.TaskCompletedEvent;
import com.example.taskmanager.domain.event.TaskCreatedEvent;
import com.example.taskmanager.domain.event.TaskStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Pattern 7 -- Event-Driven Communication (listener side).
 *
 * <p>Listens for domain events published by the service layer. The
 * {@code @Async} annotation on {@link #onTaskCompleted} causes that handler
 * to execute on a separate thread, demonstrating asynchronous event processing.
 * The {@link #onTaskCreated} handler runs synchronously within the publishing
 * transaction to show the two modes side-by-side.</p>
 *
 * <p>In a production system these handlers might send emails, update search
 * indices, or publish messages to an external broker. Here they simply log
 * to keep the reference implementation focused on the pattern mechanics.</p>
 */
@Component
public class TaskEventHandler {

    private static final Logger log = LoggerFactory.getLogger(TaskEventHandler.class);

    /**
     * Synchronous handler -- executes within the caller's transaction.
     */
    @EventListener
    public void onTaskCreated(TaskCreatedEvent event) {
        log.info("Task created: id={}, title='{}'", event.taskId(), event.title());
    }

    /**
     * Asynchronous handler -- executes on a separate thread pool.
     *
     * <p>Because this runs outside the original transaction, it must not
     * assume that lazy-loaded associations on the originating entity are
     * still available. The event record carries only primitive/immutable
     * data to avoid this problem.</p>
     */
    @Async
    @EventListener
    public void onTaskCompleted(TaskCompletedEvent event) {
        log.info("Task completed: id={}, title='{}', completedAt={}",
                event.taskId(), event.title(), event.completedAt());
    }

    @EventListener
    public void onTaskStatusChanged(TaskStatusChangedEvent event) {
        log.info("Task status changed: id={}, {} -> {}", event.taskId(), event.oldStatus(), event.newStatus());
    }
}
