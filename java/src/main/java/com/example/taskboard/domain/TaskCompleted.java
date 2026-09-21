package com.example.taskboard.domain;

/** Domain: a fact that other parts of the system may react to. Immutable. */
public record TaskCompleted(String taskId, String title) {}
