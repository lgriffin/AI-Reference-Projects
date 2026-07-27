package com.example.taskmanager.repository;

import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.domain.model.Task.TaskStatus;
import com.example.taskmanager.domain.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pattern 8 -- Test Scaffold (integration tests for the repository layer).
 *
 * <p>{@code @DataJpaTest} boots a sliced application context containing only
 * JPA-related beans and an embedded H2 database. Each test method runs inside
 * a transaction that is rolled back automatically, so tests are isolated from
 * one another without explicit cleanup.</p>
 */
@DataJpaTest
class TaskRepositoryTest {

    @Autowired private TaskRepository taskRepository;
    @Autowired private UserRepository userRepository;

    private User alice;

    @BeforeEach
    void setUp() {
        alice = new User();
        alice.setName("Alice");
        alice.setEmail("alice@example.com");
        alice = userRepository.save(alice);
    }

    @Test
    @DisplayName("findByStatus returns only tasks with the given status")
    void findByStatus() {
        taskRepository.save(createTask("Open task 1", TaskStatus.PENDING));
        taskRepository.save(createTask("Open task 2", TaskStatus.PENDING));
        taskRepository.save(createTask("Done task", TaskStatus.COMPLETED));

        List<Task> openTasks = taskRepository.findByStatus(TaskStatus.PENDING);

        assertThat(openTasks).hasSize(2)
                .allMatch(t -> t.getStatus() == TaskStatus.PENDING);
    }

    @Test
    @DisplayName("findByAssigneeId returns tasks assigned to a user")
    void findByAssigneeId() {
        Task assigned = createTask("Assigned", TaskStatus.PENDING);
        assigned.setAssignee(alice);
        taskRepository.save(assigned);
        taskRepository.save(createTask("Unassigned", TaskStatus.PENDING));

        List<Task> tasks = taskRepository.findByAssigneeId(alice.getId());

        assertThat(tasks).hasSize(1)
                .first()
                .extracting(Task::getTitle)
                .isEqualTo("Assigned");
    }

    @Test
    @DisplayName("findByAssigneeIdAndStatus filters on both dimensions")
    void findByAssigneeIdAndStatus() {
        Task open = createTask("Open assigned", TaskStatus.PENDING);
        open.setAssignee(alice);
        taskRepository.save(open);

        Task completed = createTask("Completed assigned", TaskStatus.COMPLETED);
        completed.setAssignee(alice);
        taskRepository.save(completed);

        List<Task> result = taskRepository.findByAssigneeIdAndStatus(
                alice.getId(), TaskStatus.COMPLETED);

        assertThat(result).hasSize(1)
                .first()
                .extracting(Task::getTitle)
                .isEqualTo("Completed assigned");
    }

    @Test
    @DisplayName("persisted task has createdAt set by lifecycle callback")
    void lifecycleCallback() {
        Task task = taskRepository.save(createTask("Timestamped", TaskStatus.PENDING));

        assertThat(task.getCreatedAt()).isNotNull();
    }

    // ---- Helper ------------------------------------------------------------

    private Task createTask(String title, TaskStatus status) {
        var task = new Task();
        task.setTitle(title);
        task.setStatus(status);
        return task;
    }
}
