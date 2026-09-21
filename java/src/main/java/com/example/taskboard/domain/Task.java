package com.example.taskboard.domain;

import static com.example.taskboard.domain.Status.DONE;
import static com.example.taskboard.domain.Status.IN_PROGRESS;
import static com.example.taskboard.domain.Status.TODO;

import com.example.taskboard.domain.DomainException.InvalidTransition;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Domain: a task, and the rule for how its status may change. Pure; no I/O, no framework. */
public record Task(String id, String title, Status status) {

    private static final Map<Status, Set<Status>> TRANSITIONS = Map.of(
            TODO, Set.of(IN_PROGRESS),
            IN_PROGRESS, Set.of(TODO, DONE),
            DONE, Set.of());

    public static Task create(String title) {
        return new Task(UUID.randomUUID().toString(), title, TODO);
    }

    public Task moveTo(Status next) {
        if (!TRANSITIONS.get(status).contains(next)) {
            throw new InvalidTransition(status, next);
        }
        return new Task(id, title, next);
    }
}
