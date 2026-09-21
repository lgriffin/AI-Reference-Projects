package com.example.taskboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Composition root: Spring constructs every collaborator and wires it through its constructor. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class TaskboardApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskboardApplication.class, args);
    }
}
