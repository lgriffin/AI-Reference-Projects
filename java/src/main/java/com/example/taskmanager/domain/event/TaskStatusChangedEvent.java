package com.example.taskmanager.domain.event;

public record TaskStatusChangedEvent(Long taskId, String oldStatus, String newStatus) {
}
