package com.example.taskboard.repository;

import static com.example.taskboard.domain.Status.IN_PROGRESS;
import static org.assertj.core.api.Assertions.assertThat;

import com.example.taskboard.domain.Task;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Integration: one contract, run against every TaskRepository, so the test double stays honest. */
abstract class TaskRepositoryContract {

    abstract TaskRepository repository();

    @Test
    void aSavedTaskCanBeFound() {
        Task task = Task.create("Write the paper");
        repository().save(task);
        assertThat(repository().find(task.id())).contains(task);
    }

    @Test
    void aMissingTaskIsEmpty() {
        assertThat(repository().find("no-such-id")).isEmpty();
    }

    @Test
    void savingAgainUpdatesInPlace() {
        Task task = Task.create("Write the paper");
        repository().save(task);
        repository().save(task.moveTo(IN_PROGRESS));
        assertThat(repository().findAll()).extracting(Task::status).containsExactly(IN_PROGRESS);
    }

    @Test
    @DisplayName("R-LIST-1: tasks are listed in creation order")
    void tasksAreListedInCreationOrder() {
        List<String> titles = List.of("Write", "Review", "Publish"); // creation order differs from every sort order
        titles.forEach(title -> repository().save(Task.create(title)));
        assertThat(repository().findAll()).extracting(Task::title).isEqualTo(titles);
    }

    @Test
    void tasksAreCountedByStatus() {
        repository().save(Task.create("Waiting"));
        repository().save(Task.create("Started").moveTo(IN_PROGRESS));
        assertThat(repository().countByStatus(IN_PROGRESS)).isEqualTo(1);
    }
}
