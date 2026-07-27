package com.example.taskmanager.service;

import com.example.taskmanager.config.AppConfig;
import com.example.taskmanager.domain.event.TaskCompletedEvent;
import com.example.taskmanager.domain.event.TaskCreatedEvent;
import com.example.taskmanager.domain.event.TaskStatusChangedEvent;
import com.example.taskmanager.domain.exception.InvalidStateTransitionException;
import com.example.taskmanager.domain.exception.TaskNotFoundException;
import com.example.taskmanager.domain.exception.UserNotFoundException;
import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.domain.model.Task.TaskPriority;
import com.example.taskmanager.domain.model.Task.TaskStatus;
import com.example.taskmanager.domain.model.User;
import com.example.taskmanager.repository.TaskRepository;
import com.example.taskmanager.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pattern 3 -- Service Layer & Pattern 4 -- Dependency Injection.
 *
 * <p>Encapsulates all task-related business logic. No HTTP concerns leak into
 * this class; it receives and returns domain objects. Dependencies are provided
 * through constructor injection -- the only injection style used in this
 * codebase.</p>
 *
 * <p>Transactional boundaries are declared here rather than in the repository
 * or controller, following the standard Spring convention of treating the
 * service layer as the unit-of-work coordinator.</p>
 */
@Service
@Transactional(readOnly = true)
public class TaskService {

    private static final Map<TaskStatus, Set<TaskStatus>> ALLOWED_TRANSITIONS = Map.of(
        TaskStatus.PENDING, Set.of(TaskStatus.IN_PROGRESS),
        TaskStatus.IN_PROGRESS, Set.of(TaskStatus.COMPLETED, TaskStatus.PENDING),
        TaskStatus.COMPLETED, Set.of()
    );

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AppConfig appConfig;

    // Pattern 4: constructor injection -- no @Autowired annotation needed when
    // there is a single constructor (Spring 4.3+).
    public TaskService(TaskRepository taskRepository,
                       UserRepository userRepository,
                       ApplicationEventPublisher eventPublisher,
                       AppConfig appConfig) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.appConfig = appConfig;
    }

    public List<Task> findAll() {
        return taskRepository.findAll();
    }

    public Page<Task> findAll(Pageable pageable) {
        return taskRepository.findAll(pageable);
    }

    public Task findById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id));
    }

    public List<Task> findByStatus(Task.TaskStatus status) {
        return taskRepository.findByStatus(status);
    }

    public Page<Task> findByStatus(Task.TaskStatus status, Pageable pageable) {
        return taskRepository.findByStatus(status, pageable);
    }

    public List<Task> findByAssignee(Long assigneeId) {
        return taskRepository.findByAssigneeId(assigneeId);
    }

    /**
     * Creates a new task, applying configuration defaults where values are
     * not explicitly provided.
     */
    @Transactional
    public Task create(String title, String description, TaskPriority priority) {
        var task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setPriority(priority != null
                ? priority
                : TaskPriority.valueOf(appConfig.taskDefaults().defaultPriority()));

        Task saved = taskRepository.save(task);

        // Pattern 7: publish a domain event after successful persistence.
        eventPublisher.publishEvent(TaskCreatedEvent.from(saved));

        return saved;
    }

    @Transactional
    public Task update(Long id, String title, String description, TaskPriority priority) {
        Task task = findById(id);

        if (title != null)       task.setTitle(title);
        if (description != null) task.setDescription(description);
        if (priority != null)    task.setPriority(priority);

        return taskRepository.save(task);
    }

    /**
     * Assigns a user to a task. The service validates that both resources
     * exist before performing the assignment.
     */
    @Transactional
    public Task assignTask(Long taskId, Long userId) {
        Task task = findById(taskId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        task.setAssignee(user);
        if (task.getStatus() == TaskStatus.PENDING && user != null) {
            task.setStatus(TaskStatus.IN_PROGRESS);
        }
        return taskRepository.save(task);
    }

    @Transactional
    public Task changeStatus(Long taskId, TaskStatus newStatus) {
        Task task = findById(taskId);
        TaskStatus oldStatus = task.getStatus();

        Set<TaskStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(oldStatus, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new InvalidStateTransitionException(oldStatus.name(), newStatus.name());
        }

        task.setStatus(newStatus);
        if (newStatus == TaskStatus.COMPLETED) {
            task.setCompletedAt(Instant.now());
        }

        Task saved = taskRepository.save(task);
        eventPublisher.publishEvent(new TaskStatusChangedEvent(
                saved.getId(), oldStatus.name(), newStatus.name()));
        return saved;
    }

    @Transactional
    public Task completeTask(Long taskId) {
        Task task = changeStatus(taskId, TaskStatus.COMPLETED);
        eventPublisher.publishEvent(TaskCompletedEvent.from(task));
        return task;
    }

    @Transactional
    public void delete(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new TaskNotFoundException(id);
        }
        taskRepository.deleteById(id);
    }
}
