package com.example.taskboard.events;

import com.example.taskboard.domain.TaskCompleted;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Events: side effects live here, one small method per reaction. */
@Component
class CompletionAnnouncer {

    private static final Logger log = LoggerFactory.getLogger(CompletionAnnouncer.class);

    /** Stands in for an e-mail or chat notification. Runs only after the change has committed. */
    @TransactionalEventListener
    void announce(TaskCompleted event) {
        log.info("Task completed: {} ({})", event.title(), event.taskId());
    }
}
