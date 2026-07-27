package com.example.taskmanager.domain.exception;

/**
 * Pattern 6 -- Structured Error Handling (exception hierarchy).
 *
 * <p>Thrown when a task cannot be found by its identifier. Extends
 * {@link ResourceNotFoundException} to inherit the common "not-found" semantics
 * that the global exception handler maps to HTTP 404.</p>
 */
public class TaskNotFoundException extends ResourceNotFoundException {

    public TaskNotFoundException(Long id) {
        super("Task", id);
    }
}
