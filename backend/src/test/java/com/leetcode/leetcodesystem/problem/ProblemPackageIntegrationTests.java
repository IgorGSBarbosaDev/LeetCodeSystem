package com.leetcode.leetcodesystem.problem;

import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import com.leetcode.leetcodesystem.problem.api.ProblemQueryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProblemPackageIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private ProblemQueryService problemQueryService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanProblems() {
        jdbcTemplate.update("DELETE FROM submissions");
        jdbcTemplate.update("DELETE FROM problem_progress");
        jdbcTemplate.update("DELETE FROM problem_categories");
        jdbcTemplate.update("DELETE FROM test_cases");
        jdbcTemplate.update("DELETE FROM method_parameters");
        jdbcTemplate.update("DELETE FROM problem_examples");
        jdbcTemplate.update("DELETE FROM problem_constraints");
        jdbcTemplate.update("DELETE FROM problems");
    }

    @Test
    void validationDoesNotPersistThePackage() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/validate").file(jsonFile(validPackage("two-sum-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.schemaVersion").value("1.0"))
                .andExpect(jsonPath("$.problemCount").value(1))
                .andExpect(jsonPath("$.problems[0].publicTestCases").value(1))
                .andExpect(jsonPath("$.problems[0].hiddenTestCases").value(1));

        assertThat(problemRepository.count()).isZero();
    }

    @Test
    void importPersistsOneOrMoreProblemsAndInitialProgress() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(validPackage("two-sum-001", "reverse-string-001"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.importedCount").value(2))
                .andExpect(jsonPath("$.problemIds[0]").value("two-sum-001"));

        assertThat(problemRepository.count()).isEqualTo(2);
        var problem = problemQueryService.findById("two-sum-001");
        assertThat(problem.categories()).containsExactly("ARRAY");
        assertThat(problem.method().parameters()).hasSize(1);
        assertThat(problem.testCases()).hasSize(1);
        assertThat(problem.hiddenTestCaseCount()).isEqualTo(1);
        assertThat(problem.progress().status().name()).isEqualTo("NOT_STARTED");
        assertThat(problem.progress().attempts()).isZero();
    }

    @Test
    void invalidProblemDoesNotPersistAnyPartOfThePackage() throws Exception {
        String packageJson = validPackage("valid-001")
                .replace("[\"ARRAY\"]", "[\"BFS\"]");

        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(packageJson)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PACKAGE_VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors[0].path").value("problems[0].categories[0]"));

        assertThat(problemRepository.count()).isZero();
    }

    @Test
    void existingIdRejectsTheWholePackage() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(validPackage("two-sum-001"))))
                .andExpect(status().isCreated());

        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(validPackage("two-sum-001", "new-001"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROBLEM_ID_ALREADY_EXISTS"));

        assertThat(problemRepository.count()).isEqualTo(1);
    }

    @Test
    void malformedAndTypeIncompatiblePackagesAreRejected() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/validate").file(jsonFile("{\"schemaVersion\":\"1.0\",\"problems\":[}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PACKAGE_VALIDATION_FAILED"));

        String wrongType = validPackage("wrong-type-001").replace("\"value\":1", "\"value\":\"one\"");
        mockMvc.perform(multipart("/api/problem-packages/validate").file(jsonFile(wrongType)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].path").value("problems[0].testCases[0].input.value"));

        assertThat(problemRepository.count()).isZero();
    }

    @Test
    void unknownFieldsAndOversizedFilesAreRejected() throws Exception {
        String unknownField = validPackage("unknown-001").replace("\"title\":\"Solve Value\",", "\"title\":\"Solve Value\",\"typo\":true,");

        mockMvc.perform(multipart("/api/problem-packages/validate").file(jsonFile(unknownField)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PACKAGE_VALIDATION_FAILED"));

        byte[] oversized = new byte[(int) com.leetcode.leetcodesystem.problem.importer.ProblemPackageParser.MAX_FILE_SIZE + 1];
        mockMvc.perform(multipart("/api/problem-packages/validate").file(new MockMultipartFile(
                        "file", "oversized.json", MediaType.APPLICATION_JSON_VALUE, oversized
                )))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("PACKAGE_FILE_TOO_LARGE"));

        assertThat(problemRepository.count()).isZero();
    }

    @Test
    void publicProblemDetailsHideSolutionAndHiddenTests() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/import").file(jsonFile(validPackage("two-sum-001"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/problems/two-sum-001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.starterCode").isString())
                .andExpect(jsonPath("$.testCases.length()").value(1))
                .andExpect(jsonPath("$.hiddenTestCaseCount").value(1))
                .andExpect(jsonPath("$.solution").doesNotExist());
    }

    private MockMultipartFile jsonFile(String content) {
        return new MockMultipartFile(
                "file",
                "problems.json",
                MediaType.APPLICATION_JSON_VALUE,
                content.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String validPackage(String... ids) {
        return "{\"schemaVersion\":\"1.0\",\"problems\":[" +
                java.util.Arrays.stream(ids).map(this::validProblem).reduce((left, right) -> left + "," + right).orElse("") +
                "]}";
    }

    private String validProblem(String id) {
        return "{"
                + "\"id\":\"" + id + "\","
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
                + "}";
    }
}
