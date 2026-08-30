package com.leetcode.leetcodesystem.problem.judge;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class JavaRunnerSupportedTypesTests {

    @Autowired
    private JavaRunner javaRunner;

    @Test
    void executesAllTypesSupportedBySchema() {
        assertAccepted("int", "int", "value", "class Solution { public int solve(int value) { return value; } }", "2147483647", "2147483647");
        assertAccepted("long", "long", "value", "class Solution { public long solve(long value) { return value; } }", "9223372036854775807", "9223372036854775807");
        assertAccepted("double", "double", "value", "class Solution { public double solve(double value) { return value; } }", "1.25", "1.25");
        assertAccepted("boolean", "boolean", "value", "class Solution { public boolean solve(boolean value) { return value; } }", "true", "true");
        assertAccepted("String", "String", "value", "class Solution { public String solve(String value) { return value; } }", "\"line\\nquote\\\"\"", "\"line\\nquote\\\"\"");
        assertAccepted("String", "String", "value", "class Solution { public String solve(String value) { return value; } }", "\"\\u00012\"", "\"\\u00012\"");
        assertAccepted("int[]", "int[]", "value", "class Solution { public int[] solve(int[] value) { return value; } }", "[1,-2]", "[1,-2]");
        assertAccepted("long[]", "long[]", "value", "class Solution { public long[] solve(long[] value) { return value; } }", "[1,-2]", "[1,-2]");
        assertAccepted("String[]", "String[]", "value", "class Solution { public String[] solve(String[] value) { return value; } }", "[\"a\",\"b\"]", "[\"a\",\"b\"]");
        assertAccepted("List<Integer>", "List<Integer>", "value", "import java.util.List; class Solution { public List<Integer> solve(List<Integer> value) { return value; } }", "[1,-2]", "[1,-2]");
        assertAccepted("List<String>", "List<String>", "value", "import java.util.List; class Solution { public List<String> solve(List<String> value) { return value; } }", "[\"a\",\"b\"]", "[\"a\",\"b\"]");
    }

    private void assertAccepted(
            String type,
            String parameterType,
            String parameterName,
            String code,
            String input,
            String expected
    ) {
        JudgeExecutionResult result = javaRunner.execute(
                new JudgeProblemDefinition(
                        "solve",
                        type,
                        List.of(new JudgeParameterDefinition(parameterName, parameterType)),
                        List.of(new JudgeTestCaseDefinition(0, false, "{\"" + parameterName + "\":" + input + "}", expected))
                ),
                code
        );
        assertThat(result.status()).as(type).isEqualTo(JudgeStatus.ACCEPTED);
    }
}
