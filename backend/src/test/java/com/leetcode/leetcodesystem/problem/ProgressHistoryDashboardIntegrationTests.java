package com.leetcode.leetcodesystem.problem;

import com.leetcode.leetcodesystem.problem.persistence.SubmissionRepository;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
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
import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProgressHistoryDashboardIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ProblemRepository problemRepository;

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
    void persistsPartialFavoriteAndReviewUpdatesWithoutChangingResolutionStatus() throws Exception {
        importProblem();

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.reviewRequired").value(false))
                .andExpect(jsonPath("$.status").value("NOT_STARTED"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reviewRequired\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(true))
                .andExpect(jsonPath("$.reviewRequired").value(true))
                .andExpect(jsonPath("$.status").value("NOT_STARTED"));

        mockMvc.perform(get("/api/problems/two-sum-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.favorite").value(true))
                .andExpect(jsonPath("$.progress.reviewRequired").value(true))
                .andExpect(jsonPath("$.progress.status").value("NOT_STARTED"));

        jdbcTemplate.update("UPDATE problem_progress SET status = 'REVIEW' WHERE problem_id = 'two-sum-001'");
        mockMvc.perform(get("/api/problems/two-sum-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.status").value("NOT_STARTED"))
                .andExpect(jsonPath("$.progress.reviewRequired").value(true));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(false))
                .andExpect(jsonPath("$.reviewRequired").value(true))
                .andExpect(jsonPath("$.status").value("NOT_STARTED"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.favorite").value(false))
                .andExpect(jsonPath("$.reviewRequired").value(true));
    }

    @Test
    void rejectsInvalidProgressBodiesAndMissingProblems() throws Exception {
        importProblem();

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROGRESS_UPDATE"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROGRESS_UPDATE"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROGRESS_UPDATE"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":\"yes\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROGRESS_UPDATE"));

        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"other\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PROGRESS_UPDATE"));

        mockMvc.perform(patch("/api/problems/missing/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":true}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PROBLEM_NOT_FOUND"));
    }

    @Test
    void exposesPaginatedFilteredHistoryWithoutCodeAndCodeInDetail() throws Exception {
        importProblem();
        submit("class Solution { public int solve(int value) { return 0; } }");
        submit("class Solution { public int solve(int value) { return value; } }");

        mockMvc.perform(get("/api/submissions").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].code").doesNotExist())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));

        mockMvc.perform(get("/api/submissions").param("status", "ACCEPTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].status").value("ACCEPTED"));

        mockMvc.perform(get("/api/submissions").param("problemId", "two-sum-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2));

        String submissionId = submissionRepository.findAll().getFirst().getId();
        mockMvc.perform(get("/api/submissions/{id}", submissionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.containsString("class Solution")))
                .andExpect(jsonPath("$.problemId").value("two-sum-001"));

        mockMvc.perform(get("/api/submissions").param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SUBMISSION_QUERY"));
        mockMvc.perform(get("/api/submissions").param("status", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SUBMISSION_QUERY"));
        mockMvc.perform(get("/api/submissions").param("size", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_SUBMISSION_QUERY"));
        mockMvc.perform(get("/api/submissions/missing-submission"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SUBMISSION_NOT_FOUND"));
    }

    @Test
    void exposesCompleteDashboardAndCountsMultiCategoryProblems() throws Exception {
        importProblem();
        jdbcTemplate.update("INSERT INTO problem_categories(problem_id, category_id) "
                + "SELECT ?, id FROM categories WHERE name = 'HASH_TABLE'", "two-sum-001");
        submit("class Solution { public int solve(int value) { return value; } }");
        mockMvc.perform(patch("/api/problems/two-sum-001/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"favorite\":true,\"reviewRequired\":true}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalProblems").value(1))
                .andExpect(jsonPath("$.summary.solvedProblems").value(1))
                .andExpect(jsonPath("$.summary.remainingProblems").value(0))
                .andExpect(jsonPath("$.summary.attemptedProblems").value(0))
                .andExpect(jsonPath("$.summary.completionPercentage").value(100))
                .andExpect(jsonPath("$.summary.favoriteProblems").value(1))
                .andExpect(jsonPath("$.summary.reviewProblems").value(1))
                .andExpect(jsonPath("$.byDifficulty[0].difficulty").value("EASY"))
                .andExpect(jsonPath("$.byDifficulty[0].solvedProblems").value(1))
                .andExpect(jsonPath("$.byCategory.length()").value(2))
                .andExpect(jsonPath("$.byCategory[0].category").value("ARRAY"))
                .andExpect(jsonPath("$.byCategory[1].category").value("HASH_TABLE"))
                .andExpect(jsonPath("$.recentSubmissions.length()").value(1))
                .andExpect(jsonPath("$.recentSubmissions[0].code").doesNotExist());
    }

    @Test
    void returnsZeroedDashboardForEmptyCatalog() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.totalProblems").value(0))
                .andExpect(jsonPath("$.summary.solvedProblems").value(0))
                .andExpect(jsonPath("$.summary.completionPercentage").value(0))
                .andExpect(jsonPath("$.byDifficulty.length()").value(3))
                .andExpect(jsonPath("$.byCategory.length()").value(0))
                .andExpect(jsonPath("$.recentSubmissions.length()").value(0));
    }

    @Test
    void limitsRecentActivityToFiveAndKeepsNewestFirst() throws Exception {
        importProblem();
        ProblemEntity problem = problemRepository.findById("two-sum-001").orElseThrow();
        for (int index = 0; index < 6; index++) {
            submissionRepository.save(new SubmissionEntity(
                    problem,
                    "class Solution { " + index + " }",
                    JudgeStatus.WRONG_ANSWER,
                    0,
                    2,
                    index,
                    Instant.parse("2026-08-30T10:00:0" + index + "Z")
            ));
        }

        mockMvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentSubmissions.length()").value(5))
                .andExpect(jsonPath("$.recentSubmissions[0].submittedAt").value("2026-08-30T10:00:05Z"))
                .andExpect(jsonPath("$.recentSubmissions[4].submittedAt").value("2026-08-30T10:00:01Z"))
                .andExpect(jsonPath("$.recentSubmissions[0].code").doesNotExist());
    }

    private void submit(String code) throws Exception {
        mockMvc.perform(post("/api/problems/two-sum-001/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":" + quoteJson(code) + "}"))
                .andExpect(status().isOk());
    }

    private void importProblem() throws Exception {
        mockMvc.perform(multipart("/api/problem-packages/import").file(new MockMultipartFile(
                        "file", "problems.json", MediaType.APPLICATION_JSON_VALUE, validPackage().getBytes(StandardCharsets.UTF_8))))
                .andExpect(status().isCreated());
    }

    private String quoteJson(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private String validPackage() {
        return "{\"schemaVersion\":\"1.0\",\"problems\":[{"
                + "\"id\":\"two-sum-001\",\"title\":\"Solve Value\",\"difficulty\":\"EASY\","
                + "\"categories\":[\"ARRAY\"],\"description\":\"Retorne o valor informado.\","
                + "\"constraints\":[\"O valor é um inteiro.\"],\"examples\":[{\"input\":\"value = 1\",\"output\":\"1\"}],"
                + "\"method\":{\"name\":\"solve\",\"returnType\":\"int\",\"parameters\":[{\"name\":\"value\",\"type\":\"int\"}]},"
                + "\"starterCode\":{\"java\":\"class Solution { public int solve(int value) { return value; } }\"},"
                + "\"testCases\":[{\"input\":{\"value\":1},\"expectedOutput\":1,\"hidden\":false},{\"input\":{\"value\":2},\"expectedOutput\":2,\"hidden\":true}],"
                + "\"solution\":{\"java\":\"class Solution { public int solve(int value) { return value; } }\",\"explanation\":\"Retorna o argumento.\",\"timeComplexity\":\"O(1)\",\"spaceComplexity\":\"O(1)\"}"
                + "}]}";
    }
}
