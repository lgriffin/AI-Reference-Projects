package com.example.taskboard.domain;

/**
 * Domain: every way a request can break a business rule. No HTTP in here.
 *
 * <p>The hierarchy is sealed, so the compiler knows the complete list of failures.
 */
public abstract sealed class DomainException extends RuntimeException {

    private DomainException(String message) {
        super(message);
    }

    public abstract String code();

    public static final class TaskNotFound extends DomainException {
        public TaskNotFound(String taskId) {
            super("Task '%s' does not exist.".formatted(taskId));
        }

        @Override
        public String code() {
            return "task_not_found";
        }
    }

    public static final class InvalidTransition extends DomainException {
        public InvalidTransition(Status current, Status requested) {
            super("A task cannot move from '%s' to '%s'.".formatted(current, requested));
        }

        @Override
        public String code() {
            return "invalid_transition";
        }
    }

    public static final class WipLimitExceeded extends DomainException {
        public WipLimitExceeded(int limit) {
            super("No more than %d tasks may be in progress at once.".formatted(limit));
        }

        @Override
        public String code() {
            return "wip_limit_exceeded";
        }
    }
}
