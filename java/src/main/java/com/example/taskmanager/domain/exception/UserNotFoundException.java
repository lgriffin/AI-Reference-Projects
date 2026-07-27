package com.example.taskmanager.domain.exception;

/**
 * Thrown when a user cannot be found by their identifier.
 */
public class UserNotFoundException extends ResourceNotFoundException {

    public UserNotFoundException(Long id) {
        super("User", id);
    }
}
