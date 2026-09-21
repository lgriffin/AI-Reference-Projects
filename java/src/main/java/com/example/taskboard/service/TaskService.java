package com.example.taskboard.service;

import com.example.taskboard.config.AppProperties;
import com.example.taskboard.domain.DomainException.TaskNotFound;
import com.example.taskboard.domain.DomainException.WipLimitExceeded;
import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import com.example.taskboard.domain.TaskCompleted;
import com.example.taskboard.repository.TaskRepository;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Services: every use case of the board. No HTTP, no SQL, no environment. */
@Service
public class TaskService {

    private final TaskRepository tasks;
    private final ApplicationEventPublisher events;
    private final int wipLimit;

    public TaskService(TaskRepository tasks, ApplicationEventPublisher events, AppProperties properties) {
        this.tasks = tasks;
        this.events = events;
        this.wipLimit = properties.wipLimit();
    }

    public Task createTask(String title) {
        Task task = Task.create(title);
        tasks.save(task);
        return task;
    }

    public Task getTask(String taskId) {
        return tasks.find(taskId).orElseThrow(() -> new TaskNotFound(taskId));
    }

    public List<Task> listTasks() {
        return tasks.findAll();
    }

    @Transactional
    public Task moveTask(String taskId, Status status) {
        Task task = getTask(taskId).moveTo(status);
        if (status == Status.IN_PROGRESS && boardIsFull()) {
            throw new WipLimitExceeded(wipLimit);
        }
        tasks.save(task);
        if (status == Status.DONE) {
            events.publishEvent(new TaskCompleted(task.id(), task.title()));
        }
        return task;
    }

    private boolean boardIsFull() {
        return tasks.countByStatus(Status.IN_PROGRESS) >= wipLimit;
    }
}
