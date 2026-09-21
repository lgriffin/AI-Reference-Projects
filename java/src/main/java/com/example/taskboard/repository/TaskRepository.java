package com.example.taskboard.repository;

import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import java.util.List;
import java.util.Optional;

/** Repositories: the complete list of data operations the application may perform. */
public interface TaskRepository {

    void save(Task task);

    Optional<Task> find(String taskId);

    List<Task> findAll();

    int countByStatus(Status status);
}
