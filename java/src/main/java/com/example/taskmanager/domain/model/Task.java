package com.example.taskmanager.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Core domain entity representing a task.
 *
 * <p>JPA annotations live on the domain model so that the repository layer
 * returns rich domain objects rather than anaemic DTOs. This is the standard
 * Spring Data JPA convention and keeps the layer count manageable for
 * applications of moderate complexity.</p>
 */
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskPriority priority = TaskPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant completedAt;

    // ---- Lifecycle callbacks ----

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    // ---- Accessors ----

    public Long getId() { return id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public TaskPriority getPriority() { return priority; }
    public void setPriority(TaskPriority priority) { this.priority = priority; }

    public User getAssignee() { return assignee; }
    public void setAssignee(User assignee) { this.assignee = assignee; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    // ---- Enums ----

    public enum TaskStatus {
        PENDING, IN_PROGRESS, COMPLETED
    }

    public enum TaskPriority {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}
