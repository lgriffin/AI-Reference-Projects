package com.example.taskmanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Entry point for the Task Manager application.
 *
 * <p>{@code @ConfigurationPropertiesScan} picks up {@code @ConfigurationProperties}
 * classes automatically, removing the need for {@code @EnableConfigurationProperties}
 * lists. {@code @EnableAsync} allows event listeners to run on a separate thread
 * when annotated with {@code @Async}.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class TaskManagerApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskManagerApplication.class, args);
    }
}
