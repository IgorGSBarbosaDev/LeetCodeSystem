package com.leetcode.leetcodesystem.problem;

import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import com.leetcode.leetcodesystem.problem.domain.ProgressStatus;
import com.leetcode.leetcodesystem.problem.judge.JudgeExecutionResult;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import com.leetcode.leetcodesystem.problem.persistence.ProblemProgressRepository;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import com.leetcode.leetcodesystem.problem.persistence.SubmissionPersistenceService;
import com.leetcode.leetcodesystem.problem.persistence.SubmissionRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    private ProblemProgressRepository progressRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private SubmissionPersistenceService submissionPersistenceService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanProblems() {
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS fail_progress_update");
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
    void runUsesOnlyPublicCasesAndSubmitPersistsSubmissionAndProgress() throws Exception {
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

        assertThat(submissionRepository.count()).isZero();
        var initialProgress = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(initialProgress.getAttempts()).isZero();
        assertThat(initialProgress.getStatus()).isEqualTo(ProgressStatus.NOT_STARTED);

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

        SubmissionEntity submission = submissionRepository.findAll().getFirst();
        assertThat(submission.getProblem().getId()).isEqualTo("two-sum-001");
        assertThat(submission.getCode()).isEqualTo(code);
        assertThat(submission.getStatus()).isEqualTo(JudgeStatus.ACCEPTED);
        assertThat(submission.getTestsPassed()).isEqualTo(2);
        assertThat(submission.getTotalTests()).isEqualTo(2);
        assertThat(submission.getExecutionTimeMs()).isGreaterThanOrEqualTo(0);
        assertThat(submission.getSubmittedAt()).isNotNull();

        var progress = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(progress.getAttempts()).isEqualTo(1);
        assertThat(progress.getStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(progress.getFirstSolvedAt()).isNotNull();
        assertThat(progress.getLastAttemptAt()).isEqualTo(progress.getFirstSolvedAt());

        mockMvc.perform(get("/api/problems/two-sum-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.status").value("SOLVED"))
                .andExpect(jsonPath("$.progress.attempts").value(1));
    }

    @Test
    void failedSubmissionsAreRecordedAndDoNotRegressSolvedProgress() throws Exception {
        importProblem();

        String wrongCode = "class Solution { public int solve(int value) { return 0; } }";
        execute(wrongCode).andExpect(jsonPath("$.status").value("WRONG_ANSWER"));

        var attempted = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(attempted.getAttempts()).isEqualTo(1);
        assertThat(attempted.getStatus()).isEqualTo(ProgressStatus.ATTEMPTED);
        assertThat(attempted.getFirstSolvedAt()).isNull();
        assertThat(attempted.getLastAttemptAt()).isNotNull();

        String acceptedCode = "class Solution { public int solve(int value) { return value; } }";
        execute(acceptedCode).andExpect(jsonPath("$.status").value("ACCEPTED"));
        var solved = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        var firstSolvedAt = solved.getFirstSolvedAt();
        assertThat(solved.getAttempts()).isEqualTo(2);
        assertThat(solved.getStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(firstSolvedAt).isNotNull();

        execute(wrongCode).andExpect(jsonPath("$.status").value("WRONG_ANSWER"));
        var stillSolved = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(stillSolved.getAttempts()).isEqualTo(3);
        assertThat(stillSolved.getStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(stillSolved.getFirstSolvedAt()).isEqualTo(firstSolvedAt);
        assertThat(stillSolved.getLastAttemptAt()).isNotNull();
        assertThat(submissionRepository.count()).isEqualTo(3);
    }

    @Test
    void failedSubmissionPreservesReviewFlagAndNormalizesLegacyStatus() throws Exception {
        importProblem();
        jdbcTemplate.update("UPDATE problem_progress SET status = 'REVIEW', review_required = 1 "
                + "WHERE problem_id = 'two-sum-001'");

        execute("class Solution { public int solve(int value) { return 0; } }")
                .andExpect(jsonPath("$.status").value("WRONG_ANSWER"));

        var progress = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(progress.getAttempts()).isEqualTo(1);
        assertThat(progress.getStatus()).isEqualTo(ProgressStatus.ATTEMPTED);
        assertThat(progress.isReviewRequired()).isTrue();
    }

    @Test
    void persistenceRollsBackSubmissionWhenProgressUpdateFails() throws Exception {
        importProblem();
        jdbcTemplate.execute("CREATE TRIGGER fail_progress_update BEFORE UPDATE ON problem_progress "
                + "BEGIN SELECT RAISE(ABORT, 'forced progress failure'); END");

        JudgeExecutionResult result = new JudgeExecutionResult(
                JudgeStatus.ACCEPTED,
                1,
                1,
                12,
                java.util.List.of(),
                null,
                null
        );

        assertThatThrownBy(() -> submissionPersistenceService.record("two-sum-001", "code", result))
                .isInstanceOf(RuntimeException.class);

        assertThat(submissionRepository.count()).isZero();
        var progress = progressRepository.findByProblemId("two-sum-001").orElseThrow();
        assertThat(progress.getAttempts()).isZero();
        assertThat(progress.getStatus()).isEqualTo(ProgressStatus.NOT_STARTED);
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

        assertThat(submissionRepository.findAll())
                .extracting(SubmissionEntity::getStatus)
                .containsExactlyInAnyOrder(
                        JudgeStatus.WRONG_ANSWER,
                        JudgeStatus.COMPILATION_ERROR,
                        JudgeStatus.RUNTIME_ERROR,
                        JudgeStatus.TIME_LIMIT_EXCEEDED,
                        JudgeStatus.RUNTIME_ERROR
                );
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
