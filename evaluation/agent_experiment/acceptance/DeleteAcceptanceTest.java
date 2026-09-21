package com.example.taskboard.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Hidden acceptance test for the feature request in task.md (Java). Never shown to the agent. */
@SpringBootTest(properties = {"app.wip-limit=3", "spring.datasource.url=jdbc:h2:mem:acceptance"})
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class DeleteAcceptanceTest {

    @Autowired
    private MockMvc http;

    private String create(String title) throws Exception {
        String body = http.perform(post("/tasks").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"%s\"}".formatted(title)))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    void deletingATaskRemovesIt() throws Exception {
        String taskId = create("Doomed");
        http.perform(delete("/tasks/" + taskId)).andExpect(status().isNoContent()).andExpect(content().string(""));
        http.perform(get("/tasks/" + taskId)).andExpect(status().isNotFound());
    }

    @Test
    void aTaskInProgressIsNotDeleted() throws Exception {
        String taskId = create("Busy");
        http.perform(post("/tasks/" + taskId + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"in_progress\"}"));
        http.perform(delete("/tasks/" + taskId))
                .andExpect(status().isConflict())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("task_in_progress"));
        http.perform(get("/tasks/" + taskId)).andExpect(status().isOk());
    }

    @Test
    void deletingAnUnknownTaskIsTheUsual404() throws Exception {
        http.perform(delete("/tasks/no-such-id"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("task_not_found"));
    }

    @Test
    void theTeamIsTold(CapturedOutput log) throws Exception {
        String taskId = create("Doomed");
        http.perform(delete("/tasks/" + taskId));
        assertThat(log).contains("Task deleted: Doomed (" + taskId + ")");
    }
}
