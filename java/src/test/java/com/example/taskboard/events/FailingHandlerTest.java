package com.example.taskboard.events;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import com.example.taskboard.domain.TaskCompleted;
import com.example.taskboard.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.transaction.event.TransactionalEventListener;

/** Events: a failing side effect must never fail the use case that triggered it. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:failing-handler-test")
class FailingHandlerTest {

    @TestConfiguration
    static class BrokenMailServer {
        @TransactionalEventListener
        void explode(TaskCompleted event) {
            throw new IllegalStateException("mail server is down");
        }
    }

    @Autowired
    private TaskService service;

    @Test
    void aFailingHandlerDoesNotFailTheUseCase() {
        Task task = service.createTask("Write the paper");
        service.moveTask(task.id(), Status.IN_PROGRESS);
        assertThat(service.moveTask(task.id(), Status.DONE).status()).isEqualTo(Status.DONE);
        assertThat(service.getTask(task.id()).status()).isEqualTo(Status.DONE);
    }
}
