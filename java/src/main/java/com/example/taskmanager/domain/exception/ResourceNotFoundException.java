package com.example.taskmanager.domain.exception;

/**
 * Abstract base for all "resource not found" exceptions.
 *
 * <p>The global exception handler catches this type and converts it into an
 * RFC 9457 Problem Details response with HTTP 404.</p>
 */
public abstract class ResourceNotFoundException extends RuntimeException {

    private final String resourceName;
    private final Long resourceId;

    protected ResourceNotFoundException(String resourceName, Long resourceId) {
        super("%s not found with id %d".formatted(resourceName, resourceId));
        this.resourceName = resourceName;
        this.resourceId = resourceId;
    }

    public String getResourceName() { return resourceName; }

    public Long getResourceId() { return resourceId; }
}
