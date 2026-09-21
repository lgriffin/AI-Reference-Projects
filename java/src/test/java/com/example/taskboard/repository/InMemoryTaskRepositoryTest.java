package com.example.taskboard.repository;

import com.example.taskboard.support.InMemoryTaskRepository;

class InMemoryTaskRepositoryTest extends TaskRepositoryContract {

    private final TaskRepository repository = new InMemoryTaskRepository();

    @Override
    TaskRepository repository() {
        return repository;
    }
}
