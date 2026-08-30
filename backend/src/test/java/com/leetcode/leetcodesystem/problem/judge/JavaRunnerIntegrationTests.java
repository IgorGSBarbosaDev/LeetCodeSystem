package com.leetcode.leetcodesystem.problem.judge;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JavaRunnerIntegrationTests {

    @Autowired
    private JavaRunner javaRunner;

    @Test
    void acceptsAValidSolutionAndReturnsPublicDetails() {
        JudgeExecutionResult result = javaRunner.execute(
                definition(
                        "solve",
                        "int",
                        List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(new JudgeTestCaseDefinition(0, false, "{\"value\":1}", "1"))
                ),
                "class Solution { public int solve(int value) { return value; } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.ACCEPTED);
        assertThat(result.testsPassed()).isEqualTo(1);
        assertThat(result.totalTests()).isEqualTo(1);
        assertThat(result.testResults()).singleElement().satisfies(test -> {
            assertThat(test.actualOutputJson()).isEqualTo("1");
            assertThat(test.inputJson()).isEqualTo("{\"value\":1}");
        });
    }

    @Test
    void invokesAZeroParameterMethod() {
        JudgeExecutionResult result = javaRunner.execute(
                definition(
                        "answer",
                        "int",
                        List.of(),
                        List.of(new JudgeTestCaseDefinition(0, false, "{}", "42"))
                ),
                "class Solution { public int answer() { return 42; } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.ACCEPTED);
    }

    private JudgeProblemDefinition definition(
            String method,
            String returnType,
            List<JudgeParameterDefinition> parameters,
            List<JudgeTestCaseDefinition> testCases
    ) {
        return new JudgeProblemDefinition(method, returnType, parameters, testCases);
    }
}
