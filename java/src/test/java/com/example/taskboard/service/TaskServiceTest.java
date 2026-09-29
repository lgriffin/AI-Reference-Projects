package com.example.taskboard.service;

import static com.example.taskboard.domain.Status.DONE;
import static com.example.taskboard.domain.Status.IN_PROGRESS;
import static com.example.taskboard.domain.Status.TODO;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.taskboard.config.AppProperties;
import com.example.taskboard.domain.DomainException.InvalidTransition;
import com.example.taskboard.domain.DomainException.TaskNotFound;
import com.example.taskboard.domain.DomainException.WipLimitExceeded;
import com.example.taskboard.domain.Task;
import com.example.taskboard.domain.TaskCompleted;
import com.example.taskboard.support.InMemoryTaskRepository;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Unit: business rules, exercised through the service with an in-memory repository. No Spring. */
class TaskServiceTest {

    private final List<Object> published = new ArrayList<>();
    private final TaskService service =
            new TaskService(new InMemoryTaskRepository(), published::add, new AppProperties(1));

    @Test
    @DisplayName("R-FLOW-1: given no tasks, when a task is created, then it starts in todo")
    void aNewTaskStartsInTodo() {
        assertThat(service.createTask("Write the paper").status()).isEqualTo(TODO);
    }

    @Test
    @DisplayName("R-DONE-1: given a task in progress, when it is completed, then TaskCompleted is published")
    void completingATaskPublishesAnEvent() {
        Task task = service.createTask("Write the paper");
        service.moveTask(task.id(), IN_PROGRESS);
        service.moveTask(task.id(), DONE);
        assertThat(published).containsExactly(new TaskCompleted(task.id(), "Write the paper"));
    }

    @Test
    @DisplayName("R-FLOW-2: given a task in todo, when it is moved to done, then the move is refused")
    void aTaskCannotSkipAStep() {
        Task task = service.createTask("Write the paper");
        assertThatThrownBy(() -> service.moveTask(task.id(), DONE)).isInstanceOf(InvalidTransition.class);
    }

    @Test
    @DisplayName("R-WIP-1: given a full board, when another task is started, then it is refused and stays in todo")
    void theWipLimitIsEnforced() {
        Task first = service.createTask("First");
        Task second = service.createTask("Second");
        service.moveTask(first.id(), IN_PROGRESS);
        assertThatThrownBy(() -> service.moveTask(second.id(), IN_PROGRESS)).isInstanceOf(WipLimitExceeded.class);
        assertThat(service.getTask(second.id()).status()).isEqualTo(TODO);
    }

    @Test
    @DisplayName("R-FIND-1: given no such task, when it is requested, then task_not_found is raised")
    void anUnknownTaskIsReported() {
        assertThatThrownBy(() -> service.getTask("no-such-id")).isInstanceOf(TaskNotFound.class);
    }
}
