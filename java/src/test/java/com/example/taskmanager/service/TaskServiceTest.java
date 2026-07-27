package com.example.taskmanager.service;

import com.example.taskmanager.config.AppConfig;
import com.example.taskmanager.domain.event.TaskCompletedEvent;
import com.example.taskmanager.domain.event.TaskCreatedEvent;
import com.example.taskmanager.domain.event.TaskStatusChangedEvent;
import com.example.taskmanager.domain.exception.InvalidStateTransitionException;
import com.example.taskmanager.domain.exception.TaskNotFoundException;
import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.domain.model.Task.TaskPriority;
import com.example.taskmanager.domain.model.Task.TaskStatus;
import com.example.taskmanager.domain.model.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pattern 8 -- Test Scaffold (unit tests with Mockito).
 *
 * <p>Pure unit tests for {@link TaskService}. Every collaborator is mocked so
 * that tests run in milliseconds and failures point directly at the service
 * logic rather than at infrastructure.</p>
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Captor private ArgumentCaptor<Object> eventCaptor;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        var config = new AppConfig(
                "Test App", 20,
                new AppConfig.TaskDefaults("MEDIUM", 7));
        taskService = new TaskService(
                taskRepository, userRepository, eventPublisher, config);
    }

    // ---- Nested test groups ------------------------------------------------

    @Nested
    @DisplayName("create()")
    class CreateTests {

        @Test
        @DisplayName("creates a task and publishes TaskCreatedEvent")
        void createsTaskAndPublishesEvent() {
            var saved = taskWithId(1L, "Write tests");
            when(taskRepository.save(any(Task.class))).thenReturn(saved);

            Task result = taskService.create("Write tests", "Cover all services", TaskPriority.HIGH);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getTitle()).isEqualTo("Write tests");

            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue()).isInstanceOf(TaskCreatedEvent.class);
        }

        @Test
        @DisplayName("applies default priority from configuration when null")
        void appliesDefaultPriority() {
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

            Task result = taskService.create("No priority", null, null);

            assertThat(result.getPriority()).isEqualTo(TaskPriority.MEDIUM);
        }
    }

    @Nested
    @DisplayName("findById()")
    class FindByIdTests {

        @Test
        @DisplayName("returns task when found")
        void returnsTask() {
            var task = taskWithId(1L, "Found");
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

            assertThat(taskService.findById(1L).getTitle()).isEqualTo("Found");
        }

        @Test
        @DisplayName("throws TaskNotFoundException when not found")
        void throwsWhenNotFound() {
            when(taskRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> taskService.findById(99L))
                    .isInstanceOf(TaskNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    @Nested
    @DisplayName("changeStatus()")
    class ChangeStatusTests {

        @Test
        @DisplayName("valid transition PENDING -> IN_PROGRESS succeeds")
        void validTransition() {
            var task = taskWithId(1L, "Start work");
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

            Task result = taskService.changeStatus(1L, TaskStatus.IN_PROGRESS);

            assertThat(result.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);

            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue()).isInstanceOf(TaskStatusChangedEvent.class);
        }

        @Test
        @DisplayName("invalid transition COMPLETED -> PENDING throws InvalidStateTransitionException")
        void invalidTransition() {
            var task = taskWithId(1L, "Done task");
            task.setStatus(TaskStatus.COMPLETED);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

            assertThatThrownBy(() -> taskService.changeStatus(1L, TaskStatus.PENDING))
                    .isInstanceOf(InvalidStateTransitionException.class);
        }

        @Test
        @DisplayName("publishes TaskStatusChangedEvent with correct old and new status")
        void publishesEvent() {
            var task = taskWithId(1L, "Track status");
            task.setStatus(TaskStatus.IN_PROGRESS);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

            taskService.changeStatus(1L, TaskStatus.COMPLETED);

            verify(eventPublisher).publishEvent(eventCaptor.capture());
            TaskStatusChangedEvent event = (TaskStatusChangedEvent) eventCaptor.getValue();
            assertThat(event.oldStatus()).isEqualTo("IN_PROGRESS");
            assertThat(event.newStatus()).isEqualTo("COMPLETED");
        }
    }

    @Nested
    @DisplayName("completeTask()")
    class CompleteTests {

        @Test
        @DisplayName("delegates to changeStatus and publishes TaskCompletedEvent")
        void completesTask() {
            var task = taskWithId(1L, "Finish report");
            task.setStatus(TaskStatus.IN_PROGRESS);
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

            Task result = taskService.completeTask(1L);

            assertThat(result.getStatus()).isEqualTo(TaskStatus.COMPLETED);
            assertThat(result.getCompletedAt()).isNotNull();

            verify(eventPublisher, times(2)).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getAllValues())
                    .extracting(Object::getClass)
                    .containsExactly(TaskStatusChangedEvent.class, TaskCompletedEvent.class);
        }
    }

    @Nested
    @DisplayName("assignTask()")
    class AssignTests {

        @Test
        @DisplayName("assigns user and transitions status to IN_PROGRESS")
        void assignsUser() {
            var task = taskWithId(1L, "Review PR");
            var user = userWithId(5L, "Alice");
            when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
            when(userRepository.findById(5L)).thenReturn(Optional.of(user));
            when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

            Task result = taskService.assignTask(1L, 5L);

            assertThat(result.getAssignee().getId()).isEqualTo(5L);
            assertThat(result.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        }
    }

    @Nested
    @DisplayName("findByStatus()")
    class FindByStatusTests {

        @Test
        @DisplayName("delegates to repository")
        void delegates() {
            when(taskRepository.findByStatus(TaskStatus.PENDING))
                    .thenReturn(List.of(taskWithId(1L, "Open task")));

            List<Task> tasks = taskService.findByStatus(TaskStatus.PENDING);

            assertThat(tasks).hasSize(1);
            verify(taskRepository).findByStatus(TaskStatus.PENDING);
        }

        @Test
        @DisplayName("paginated overload delegates to repository")
        void paginatedDelegates() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Task> page = new PageImpl<>(List.of(taskWithId(1L, "Open task")), pageable, 1);
            when(taskRepository.findByStatus(TaskStatus.PENDING, pageable)).thenReturn(page);

            Page<Task> result = taskService.findByStatus(TaskStatus.PENDING, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getTotalElements()).isEqualTo(1);
            verify(taskRepository).findByStatus(TaskStatus.PENDING, pageable);
        }
    }

    @Nested
    @DisplayName("findAll(Pageable)")
    class FindAllPageableTests {

        @Test
        @DisplayName("delegates to repository with pageable")
        void delegates() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Task> page = new PageImpl<>(
                    List.of(taskWithId(1L, "Task 1"), taskWithId(2L, "Task 2")), pageable, 2);
            when(taskRepository.findAll(pageable)).thenReturn(page);

            Page<Task> result = taskService.findAll(pageable);

            assertThat(result.getContent()).hasSize(2);
            assertThat(result.getTotalElements()).isEqualTo(2);
            verify(taskRepository).findAll(pageable);
        }
    }

    @Nested
    @DisplayName("delete()")
    class DeleteTests {

        @Test
        @DisplayName("deletes when task exists")
        void deletesExisting() {
            when(taskRepository.existsById(1L)).thenReturn(true);

            taskService.delete(1L);

            verify(taskRepository).deleteById(1L);
        }

        @Test
        @DisplayName("throws TaskNotFoundException when task does not exist")
        void throwsWhenMissing() {
            when(taskRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> taskService.delete(99L))
                    .isInstanceOf(TaskNotFoundException.class);
        }
    }

    // ---- Helpers -----------------------------------------------------------

    private static Task taskWithId(Long id, String title) {
        var task = new Task();
        task.setTitle(title);
        // Use reflection to set the id since it's generated
        try {
            var idField = Task.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(task, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return task;
    }

    private static User userWithId(Long id, String name) {
        var user = new User();
        user.setName(name);
        user.setEmail(name.toLowerCase() + "@example.com");
        try {
            var idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return user;
    }
}
