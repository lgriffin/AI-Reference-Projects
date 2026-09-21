package com.example.taskboard.domain;

public enum Status {
    TODO,
    IN_PROGRESS,
    DONE;

    @Override
    public String toString() {
        return name().toLowerCase();
    }
}
