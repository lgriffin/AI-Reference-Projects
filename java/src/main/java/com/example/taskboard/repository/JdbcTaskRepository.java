package com.example.taskboard.repository;

import com.example.taskboard.domain.Status;
import com.example.taskboard.domain.Task;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Repositories: TaskRepository on JDBC. The only class that speaks SQL. */
@Repository
class JdbcTaskRepository implements TaskRepository {

    private final JdbcClient jdbc;

    JdbcTaskRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void save(Task task) {
        jdbc.sql("MERGE INTO tasks (id, title, status) KEY (id) VALUES (?, ?, ?)")
                .params(task.id(), task.title(), task.status().name())
                .update();
    }

    @Override
    public Optional<Task> find(String taskId) {
        return jdbc.sql("SELECT id, title, status FROM tasks WHERE id = ?")
                .param(taskId)
                .query(JdbcTaskRepository::toTask)
                .optional();
    }

    @Override
    public List<Task> findAll() {
        return jdbc.sql("SELECT id, title, status FROM tasks ORDER BY position")
                .query(JdbcTaskRepository::toTask)
                .list();
    }

    @Override
    public int countByStatus(Status status) {
        return jdbc.sql("SELECT COUNT(*) FROM tasks WHERE status = ?")
                .param(status.name())
                .query(Integer.class)
                .single();
    }

    private static Task toTask(ResultSet row, int rowNumber) throws SQLException {
        return new Task(row.getString("id"), row.getString("title"), Status.valueOf(row.getString("status")));
    }
}
