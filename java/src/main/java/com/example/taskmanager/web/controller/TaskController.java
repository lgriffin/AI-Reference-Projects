package com.example.taskmanager.web.controller;

import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.service.TaskService;
import com.example.taskmanager.web.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Pattern 1 -- Layered Architecture (presentation layer).
 *
 * <p>The controller's responsibilities are deliberately narrow:
 * <ol>
 *     <li>Accept and validate HTTP input (via {@code @Valid}).</li>
 *     <li>Delegate to the service layer.</li>
 *     <li>Map domain objects to response DTOs.</li>
 *     <li>Return the appropriate HTTP status code.</li>
 * </ol>
 *
 * <p>No business logic resides here. The controller does not access
 * repositories directly; it depends only on {@link TaskService}.</p>
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<TaskResponse> list(
            @RequestParam(required = false) Task.TaskStatus status) {
        List<Task> tasks = (status != null)
                ? taskService.findByStatus(status)
                : taskService.findAll();
        return tasks.stream().map(TaskResponse::from).toList();
    }

    @GetMapping("/{id}")
    public TaskResponse getById(@PathVariable Long id) {
        return TaskResponse.from(taskService.findById(id));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
        Task task = taskService.create(
                request.title(), request.description(), request.priority());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(TaskResponse.from(task));
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id,
                               @Valid @RequestBody UpdateTaskRequest request) {
        Task task = taskService.update(
                id, request.title(), request.description(), request.priority());
        return TaskResponse.from(task);
    }

    @PostMapping("/{id}/assign")
    public TaskResponse assign(@PathVariable Long id,
                               @Valid @RequestBody AssignTaskRequest request) {
        Task task = taskService.assignTask(id, request.userId());
        return TaskResponse.from(task);
    }

    @PostMapping("/{id}/status")
    public TaskResponse changeStatus(@PathVariable Long id,
                                      @Valid @RequestBody ChangeStatusRequest request) {
        Task task = taskService.changeStatus(id, request.status());
        return TaskResponse.from(task);
    }

    @PostMapping("/{id}/complete")
    public TaskResponse complete(@PathVariable Long id) {
        Task task = taskService.completeTask(id);
        return TaskResponse.from(task);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        taskService.delete(id);
    }
}
