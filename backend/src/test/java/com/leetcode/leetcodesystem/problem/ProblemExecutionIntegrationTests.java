package com.leetcode.leetcodesystem.problem;

import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProblemExecutionIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanProblems() {
        jdbcTemplate.update("DELETE FROM problem_progress");
        jdbcTemplate.update("DELETE FROM problem_categories");
        jdbcTemplate.update("DELETE FROM test_cases");
        jdbcTemplate.update("DELETE FROM method_parameters");
        jdbcTemplate.update("DELETE FROM problem_examples");
        jdbcTemplate.update("DELETE FROM problem_constraints");
        jdbcTemplate.update("DELETE FROM problems");
    }

    @Test
    void runUsesOnlyPublicCasesAndSubmitRedactsHiddenValues() throws Exception {
        importProblem();
        String code = "class Solution { public int solve(int value) { return value; } }";

        mockMvc.perform(post("/api/problems/two-sum-001/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonRequest(code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.testsPassed").value(1))
                .andExpect(jsonPath("$.totalTests").value(1))
                .andExpect(jsonPath("$.testResults.length()").value(1))
                .andExpect(jsonPath("$.testResults[0].input.value").value(1));

        mockMvc.perform(post("/api/problems/two-sum-001/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonRequest(code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.testsPassed").value(2))
                .andExpect(jsonPath("$.totalTests").value(2))
                .andExpect(jsonPath("$.testResults.length()").value(2))
                .andExpect(jsonPath("$.testResults[1].hidden").value(true))
                .andExpect(jsonPath("$.testResults[1].input").doesNotExist())
                .andExpect(jsonPath("$.testResults[1].expectedOutput").doesNotExist())
                .andExpect(jsonPath("$.testResults[1].actualOutput").doesNotExist());

        assertThat(jdbcTemplate.queryForObject(
                "SELECT attempts FROM problem_progress WHERE problem_id = 'two-sum-001'", Integer.class
        )).isZero();
    }

    @Test
    void exposesAllUserFacingStatusesAndRequestErrors() throws Exception {
        importProblem();

        execute("class Solution { public int solve(int value) { return 0; } }")
                .andExpect(jsonPath("$.status").value("WRONG_ANSWER"));
        execute("class Solution { public int solve(int value) { return ; } }")
                .andExpect(jsonPath("$.status").value("COMPILATION_ERROR"));
        execute("class Solution { public int solve(int value) { throw new RuntimeException(); } }")
                .andExpect(jsonPath("$.status").value("RUNTIME_ERROR"));
        execute("class Solution { public int solve(int value) { while (true) {} } }")
                .andExpect(jsonPath("$.status").value("TIME_LIMIT_EXCEEDED"));

        mockMvc.perform(post("/api/problems/two-sum-001/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CODE_REQUIRED"));

        mockMvc.perform(post("/api/problems/missing/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonRequest("class Solution {}")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROBLEM_NOT_FOUND"));

        execute("class Solution { public int solve(int value) { if (value == 2) throw new IllegalStateException(\"hidden \" + value); return value; } }")
                .andExpect(jsonPath("$.status").value("RUNTIME_ERROR"))
                .andExpect(jsonPath("$.runtimeError").value("Ocorreu um erro de execução em um teste oculto."))
                .andExpect(jsonPath("$.testResults[1].error").doesNotExist());
    }

    private org.springframework.test.web.servlet.ResultActions execute(String code) throws Exception {
        return mockMvc.perform(post("/api/problems/two-sum-001/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest(code)));
    }

    private void importProblem() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(validPackage())))
                .andExpect(status().isCreated());
    }

    private MockMultipartFile jsonFile(String content) {
        return new MockMultipartFile(
                "file",
                "problems.json",
                MediaType.APPLICATION_JSON_VALUE,
                content.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String jsonRequest(String code) {
        return "{\"code\":" + quoteJson(code) + "}";
    }

    private String quoteJson(String value) {
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r") + "\"";
    }

    private String validPackage() {
        return "{\"schemaVersion\":\"1.0\",\"problems\":[{"
                + "\"id\":\"two-sum-001\","
                + "\"title\":\"Solve Value\","
                + "\"difficulty\":\"EASY\","
                + "\"categories\":[\"ARRAY\"],"
                + "\"description\":\"Retorne o valor informado.\","
                + "\"constraints\":[\"O valor é um inteiro.\"],"
                + "\"examples\":[{\"input\":\"value = 1\",\"output\":\"1\"}],"
                + "\"method\":{\"name\":\"solve\",\"returnType\":\"int\",\"parameters\":[{\"name\":\"value\",\"type\":\"int\"}]},"
                + "\"starterCode\":{\"java\":\"class Solution { public int solve(int value) { return value; } }\"},"
                + "\"testCases\":["
                + "{\"input\":{\"value\":1},\"expectedOutput\":1,\"hidden\":false},"
                + "{\"input\":{\"value\":2},\"expectedOutput\":2,\"hidden\":true}"
                + "],"
                + "\"solution\":{\"java\":\"class Solution { public int solve(int value) { return value; } }\",\"explanation\":\"Retorna o argumento.\",\"timeComplexity\":\"O(1)\",\"spaceComplexity\":\"O(1)\"}"
                + "}]}";
    }
}
