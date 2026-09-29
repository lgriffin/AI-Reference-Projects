package com.example.taskboard.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** API: the whole stack over HTTP, wired by the real composition root. */
@SpringBootTest(properties = {"app.wip-limit=1", "spring.datasource.url=jdbc:h2:mem:api-test"})
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@Sql(statements = "DELETE FROM tasks")
class TaskApiTest {

    @Autowired
    private MockMvc http;

    @Test
    @DisplayName("R-MOVE-1, R-DONE-1: given a new task, when it is started and completed, then it is listed as done and announced")
    void aTaskMovesAcrossTheBoard(CapturedOutput log) throws Exception {
        String taskId = create("Write the paper");
        move(taskId, "in_progress");
        move(taskId, "done");

        http.perform(get("/tasks/" + taskId))
                .andExpect(jsonPath("$.title").value("Write the paper"))
                .andExpect(jsonPath("$.status").value("done"));
        http.perform(get("/tasks")).andExpect(jsonPath("$.length()").value(1));
        assertThat(log).contains("Task completed: Write the paper");
    }

    @Test
    @DisplayName("R-ERR-1, R-VAL-1: given each kind of refused request, when it is sent, then a problem document carries its code")
    void everyFailureIsAProblemDocument() throws Exception {
        String started = create("Started");
        String waiting = create("Waiting");
        move(started, "in_progress");

        expectProblem(http.perform(get("/tasks/no-such-id")), 404, "task_not_found");
        expectProblem(move(waiting, "done"), 409, "invalid_transition");
        expectProblem(move(waiting, "in_progress"), 409, "wip_limit_exceeded");
        expectProblem(http.perform(json(post("/tasks"), "{\"title\": \"\"}")), 400, "validation_failed");
    }

    private String create(String title) throws Exception {
        String body = http.perform(json(post("/tasks"), "{\"title\": \"%s\"}".formatted(title)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private ResultActions move(String taskId, String status) throws Exception {
        return http.perform(json(post("/tasks/" + taskId + "/status"), "{\"status\": \"%s\"}".formatted(status)));
    }

    private static void expectProblem(ResultActions response, int status, String code) throws Exception {
        response.andExpect(status().is(status))
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value(code));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder json(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }
}
