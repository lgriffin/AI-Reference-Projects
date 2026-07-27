package com.example.taskmanager.repository;

import com.example.taskmanager.domain.model.Task;
import com.example.taskmanager.domain.model.Task.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Pattern 2 -- Repository Pattern.
 *
 * <p>Spring Data JPA generates the implementation at runtime. The interface
 * extends {@link JpaRepository} for standard CRUD plus pagination and sorting,
 * and declares custom query methods using Spring Data's method-name derivation.</p>
 *
 * <p>Repositories return domain objects ({@link Task}), not DTOs. The web layer
 * is responsible for mapping domain objects to response DTOs.</p>
 */
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByStatus(TaskStatus status);

    Page<Task> findByStatus(TaskStatus status, Pageable pageable);

    List<Task> findByAssigneeId(Long assigneeId);

    List<Task> findByAssigneeIdAndStatus(Long assigneeId, TaskStatus status);
}
