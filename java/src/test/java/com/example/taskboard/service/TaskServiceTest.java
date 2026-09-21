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
import org.junit.jupiter.api.Test;

/** Unit: business rules, exercised through the service with an in-memory repository. No Spring. */
class TaskServiceTest {

    private final List<Object> published = new ArrayList<>();
    private final TaskService service =
            new TaskService(new InMemoryTaskRepository(), published::add, new AppProperties(1));

    @Test
    void aNewTaskStartsInTodo() {
        assertThat(service.createTask("Write the paper").status()).isEqualTo(TODO);
    }

    @Test
    void completingATaskPublishesAnEvent() {
        Task task = service.createTask("Write the paper");
        service.moveTask(task.id(), IN_PROGRESS);
        service.moveTask(task.id(), DONE);
        assertThat(published).containsExactly(new TaskCompleted(task.id(), "Write the paper"));
    }

    @Test
    void aTaskCannotSkipAStep() {
        Task task = service.createTask("Write the paper");
        assertThatThrownBy(() -> service.moveTask(task.id(), DONE)).isInstanceOf(InvalidTransition.class);
    }

    @Test
    void theWipLimitIsEnforced() {
        Task first = service.createTask("First");
        Task second = service.createTask("Second");
        service.moveTask(first.id(), IN_PROGRESS);
        assertThatThrownBy(() -> service.moveTask(second.id(), IN_PROGRESS)).isInstanceOf(WipLimitExceeded.class);
        assertThat(service.getTask(second.id()).status()).isEqualTo(TODO);
    }

    @Test
    void anUnknownTaskIsReported() {
        assertThatThrownBy(() -> service.getTask("no-such-id")).isInstanceOf(TaskNotFound.class);
    }
}
