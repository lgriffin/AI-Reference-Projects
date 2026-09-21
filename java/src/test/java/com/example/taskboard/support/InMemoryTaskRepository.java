package com.example.taskboard.support;

import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import com.example.taskboard.repository.TaskRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Test support: a TaskRepository that keeps tasks in a map. Shared by every unit test. */
public class InMemoryTaskRepository implements TaskRepository {

    private final Map<String, Task> tasks = new LinkedHashMap<>();

    @Override
    public void save(Task task) {
        tasks.put(task.id(), task);
    }

    @Override
    public Optional<Task> find(String taskId) {
        return Optional.ofNullable(tasks.get(taskId));
    }

    @Override
    public List<Task> findAll() {
        return List.copyOf(tasks.values());
    }

    @Override
    public int countByStatus(Status status) {
        return (int) tasks.values().stream().filter(task -> task.status() == status).count();
    }
}
