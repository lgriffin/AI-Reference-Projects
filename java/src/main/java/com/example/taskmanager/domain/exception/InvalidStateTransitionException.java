package com.example.taskmanager.domain.exception;

public class InvalidStateTransitionException extends RuntimeException {
    private final String currentStatus;
    private final String requestedStatus;

    public InvalidStateTransitionException(String currentStatus, String requestedStatus) {
        super("Cannot transition from '%s' to '%s'".formatted(currentStatus, requestedStatus));
        this.currentStatus = currentStatus;
        this.requestedStatus = requestedStatus;
    }

    public String getCurrentStatus() { return currentStatus; }
    public String getRequestedStatus() { return requestedStatus; }
}
