package com.example.taskmanager.web;

import com.example.taskmanager.domain.exception.TaskNotFoundException;
import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.domain.model.Task.TaskPriority;
import com.example.taskmanager.domain.model.Task.TaskStatus;
import com.example.taskmanager.service.TaskService;
import com.example.taskmanager.web.controller.TaskController;
import com.example.taskmanager.web.advice.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Pattern 8 -- Test Scaffold (API tests with MockMvc).
 *
 * <p>{@code @WebMvcTest} loads only the web layer (controller + advice) and
 * replaces the service with a Mockito mock via {@code @MockBean}. Tests verify
 * HTTP status codes, response shapes, validation, and the error-handling
 * advice.</p>
 */
@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean  private TaskService taskService;

    // ---- GET /api/tasks ----------------------------------------------------

    @Test
    @DisplayName("GET /api/tasks returns 200 with task list")
    void listTasks() throws Exception {
        when(taskService.findAll()).thenReturn(List.of(taskWithId(1L, "First")));

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("First")));
    }

    // ---- GET /api/tasks/{id} -----------------------------------------------

    @Test
    @DisplayName("GET /api/tasks/{id} returns 200 when found")
    void getTaskById() throws Exception {
        when(taskService.findById(1L)).thenReturn(taskWithId(1L, "Found"));

        mockMvc.perform(get("/api/tasks/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Found")));
    }

    @Test
    @DisplayName("GET /api/tasks/{id} returns 404 Problem Detail when not found")
    void getTaskNotFound() throws Exception {
        when(taskService.findById(99L)).thenThrow(new TaskNotFoundException(99L));

        mockMvc.perform(get("/api/tasks/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title", is("Resource Not Found")))
                .andExpect(jsonPath("$.detail", containsString("99")));
    }

    // ---- POST /api/tasks ---------------------------------------------------

    @Test
    @DisplayName("POST /api/tasks returns 201 on success")
    void createTask() throws Exception {
        var saved = taskWithId(1L, "New task");
        when(taskService.create(eq("New task"), any(), any())).thenReturn(saved);

        String body = """
                { "title": "New task", "description": "Do something" }
                """;

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.title", is("New task")));
    }

    @Test
    @DisplayName("POST /api/tasks returns 400 when title is blank")
    void createTaskValidationFails() throws Exception {
        String body = """
                { "title": "", "description": "Missing title" }
                """;

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title", is("Validation Error")))
                .andExpect(jsonPath("$.errors.title").exists());
    }

    // ---- POST /api/tasks/{id}/status --------------------------------------

    @Test
    @DisplayName("POST /api/tasks/{id}/status returns 200 on valid transition")
    void changeStatus() throws Exception {
        var task = taskWithId(1L, "Transition task");
        task.setStatus(TaskStatus.IN_PROGRESS);
        when(taskService.changeStatus(eq(1L), eq(TaskStatus.IN_PROGRESS))).thenReturn(task);

        String body = """
                { "status": "IN_PROGRESS" }
                """;

        mockMvc.perform(post("/api/tasks/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")));
    }

    // ---- DELETE /api/tasks/{id} -------------------------------------------

    @Test
    @DisplayName("DELETE /api/tasks/{id} returns 204")
    void deleteTask() throws Exception {
        mockMvc.perform(delete("/api/tasks/1"))
                .andExpect(status().isNoContent());
    }

    // ---- Helper ------------------------------------------------------------

    private static Task taskWithId(Long id, String title) {
        var task = new Task();
        task.setTitle(title);
        try {
            var idField = Task.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(task, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return task;
    }
}
