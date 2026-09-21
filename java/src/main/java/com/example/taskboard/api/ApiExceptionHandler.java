package com.example.taskboard.api;

import com.example.taskboard.domain.DomainException;
import com.example.taskboard.domain.DomainException.InvalidTransition;
import com.example.taskboard.domain.DomainException.TaskNotFound;
import com.example.taskboard.domain.DomainException.WipLimitExceeded;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** API: the single place where errors become HTTP responses (RFC 9457 problem details). */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler
    ProblemDetail domainError(DomainException error) {
        // No default branch: a new DomainException will not compile until it has a status.
        HttpStatus status = switch (error) {
            case TaskNotFound e -> HttpStatus.NOT_FOUND;
            case InvalidTransition e -> HttpStatus.CONFLICT;
            case WipLimitExceeded e -> HttpStatus.CONFLICT;
        };
        return problem(status, error.code(), error.getMessage());
    }

    @ExceptionHandler
    ProblemDetail invalidRequest(MethodArgumentNotValidException error) {
        FieldError first = error.getFieldErrors().getFirst();
        return problem(HttpStatus.BAD_REQUEST, "validation_failed", first.getField() + ": " + first.getDefaultMessage());
    }

    private static ProblemDetail problem(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty("code", code);
        return problem;
    }
}
