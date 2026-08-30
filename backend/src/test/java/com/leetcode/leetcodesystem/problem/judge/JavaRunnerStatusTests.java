package com.leetcode.leetcodesystem.problem.judge;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;
import java.util.Set;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JavaRunnerStatusTests {

    @Autowired
    private JavaRunner javaRunner;

    @Test
    void reportsWrongAnswerForEveryCompletedCase() {
        JudgeExecutionResult result = javaRunner.execute(
                definition("solve", "int", List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(
                                test(0, false, "{\"value\":1}", "1"),
                                test(1, true, "{\"value\":2}", "2")
                        )),
                "class Solution { public int solve(int value) { return 0; } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.WRONG_ANSWER);
        assertThat(result.testsPassed()).isZero();
        assertThat(result.testResults()).hasSize(2);
    }

    @Test
    void reportsCompilationError() {
        JudgeExecutionResult result = javaRunner.execute(
                definition("solve", "int", List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(test(0, false, "{\"value\":1}", "1"))),
                "class Solution { public int solve(int value) { return ; } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.COMPILATION_ERROR);
        assertThat(result.compilationError()).contains("return");
        assertThat(result.testResults()).isEmpty();
    }

    @Test
    void reportsRuntimeError() {
        JudgeExecutionResult result = javaRunner.execute(
                definition("solve", "int", List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(test(0, false, "{\"value\":1}", "1"))),
                "class Solution { public int solve(int value) { throw new IllegalStateException(\"boom\"); } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.RUNTIME_ERROR);
        assertThat(result.runtimeError()).contains("IllegalStateException");
        assertThat(result.testResults()).singleElement().extracting(JudgeTestResult::status)
                .isEqualTo(JudgeStatus.RUNTIME_ERROR);
    }

    @Test
    void reportsTimeoutAndTheInterruptedTest() {
        JudgeExecutionResult result = javaRunner.execute(
                definition("solve", "int", List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(test(0, false, "{\"value\":1}", "1"))),
                "class Solution { public int solve(int value) { while (true) { } } }"
        );

        assertThat(result.status()).isEqualTo(JudgeStatus.TIME_LIMIT_EXCEEDED);
        assertThat(result.testResults()).singleElement().extracting(JudgeTestResult::status)
                .isEqualTo(JudgeStatus.TIME_LIMIT_EXCEEDED);
    }

    @Test
    void removesTheTemporaryDirectoryAfterExecution() throws Exception {
        Path tempDirectory = Path.of(System.getProperty("java.io.tmpdir"));
        Set<String> before = temporaryRunnerDirectories(tempDirectory);

        javaRunner.execute(
                definition("solve", "int", List.of(new JudgeParameterDefinition("value", "int")),
                        List.of(test(0, false, "{\"value\":1}", "1"))),
                "class Solution { public int solve(int value) { return value; } }"
        );

        assertThat(temporaryRunnerDirectories(tempDirectory)).containsExactlyInAnyOrderElementsOf(before);
    }

    private Set<String> temporaryRunnerDirectories(Path tempDirectory) throws Exception {
        try (var paths = Files.list(tempDirectory)) {
            return paths
                    .filter(Files::isDirectory)
                    .map(path -> path.getFileName().toString())
                    .filter(name -> name.startsWith("leetcodesystem-judge-"))
                    .collect(java.util.stream.Collectors.toSet());
        }
    }

    private JudgeTestCaseDefinition test(int index, boolean hidden, String input, String expected) {
        return new JudgeTestCaseDefinition(index, hidden, input, expected);
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
