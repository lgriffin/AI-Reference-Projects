package com.example.taskboard.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.jdbc.Sql;

/** Runs the contract against a real (embedded) database, emptied before each test. */
@JdbcTest
@Sql(statements = "DELETE FROM tasks")
@Import(JdbcTaskRepository.class)
class JdbcTaskRepositoryTest extends TaskRepositoryContract {

    @Autowired
    private JdbcTaskRepository repository;

    @Override
    TaskRepository repository() {
        return repository;
    }
}
