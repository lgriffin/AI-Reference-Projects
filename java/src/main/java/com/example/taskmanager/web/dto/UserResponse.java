package com.example.taskmanager.web.dto;

import com.example.taskmanager.domain.model.User;
import java.time.Instant;

/**
 * Outbound DTO for user data.
 */
public record UserResponse(Long id, String name, String email, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
    }
}
