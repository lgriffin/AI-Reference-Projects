package com.example.taskboard.api;

import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import com.example.taskboard.service.TaskService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** API: translate HTTP to service calls and back. No business rules, no try/catch. */
@RestController
@RequestMapping("/tasks")
class TaskController {

    record CreateTask(@NotBlank @Size(max = 200) String title) {}

    record MoveTask(@NotNull Status status) {}

    private final TaskService service;

    TaskController(TaskService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Task createTask(@Valid @RequestBody CreateTask body) {
        return service.createTask(body.title());
    }

    @GetMapping
    List<Task> listTasks() {
        return service.listTasks();
    }

    @GetMapping("/{taskId}")
    Task getTask(@PathVariable String taskId) {
        return service.getTask(taskId);
    }

    @PostMapping("/{taskId}/status")
    Task moveTask(@PathVariable String taskId, @Valid @RequestBody MoveTask body) {
        return service.moveTask(taskId, body.status());
    }
}
