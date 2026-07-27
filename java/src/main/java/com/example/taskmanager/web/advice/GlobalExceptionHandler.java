package com.example.taskmanager.web.advice;

import com.example.taskmanager.domain.exception.InvalidStateTransitionException;
import com.example.taskmanager.domain.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Pattern 6 -- Structured Error Handling.
 *
 * <p>A single {@code @RestControllerAdvice} class converts domain exceptions
 * into RFC 9457 Problem Details responses. This centralises error handling
 * and guarantees a consistent JSON error shape across every endpoint.</p>
 *
 * <p>Spring 6+ natively supports {@link ProblemDetail}, so we construct one
 * directly rather than returning a custom error DTO.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handles all "resource not found" exceptions from the domain layer.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setType(URI.create("https://example.com/problems/not-found"));
        problem.setProperty("resourceName", ex.getResourceName());
        problem.setProperty("resourceId", ex.getResourceId());
        return problem;
    }

    /**
     * Handles Jakarta Bean Validation failures on request DTOs.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid",
                        (a, b) -> a));

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setTitle("Validation Error");
        problem.setType(URI.create("https://example.com/problems/validation"));
        problem.setProperty("errors", fieldErrors);
        return problem;
    }

    /**
     * Handles domain-level illegal-argument errors (e.g., duplicate email).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, ex.getMessage());
        problem.setTitle("Conflict");
        problem.setType(URI.create("https://example.com/problems/conflict"));
        return problem;
    }

    /**
     * Handles invalid state transition errors (e.g., completing an
     * already-completed task).
     */
    @ExceptionHandler(InvalidStateTransitionException.class)
    public ProblemDetail handleInvalidTransition(InvalidStateTransitionException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Invalid State Transition");
        problem.setType(URI.create("https://example.com/problems/invalid-transition"));
        problem.setProperty("currentStatus", ex.getCurrentStatus());
        problem.setProperty("requestedStatus", ex.getRequestedStatus());
        return problem;
    }

    /**
     * Catch-all for unexpected errors.
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred");
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("https://example.com/problems/internal"));
        return problem;
    }
}
