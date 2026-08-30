package com.leetcode.leetcodesystem.problem.judge;

import java.util.List;

public record JudgeExecutionResult(
        JudgeStatus status,
        int testsPassed,
        int totalTests,
        long executionTimeMs,
        List<JudgeTestResult> testResults,
        String compilationError,
        String runtimeError
) {
    public JudgeExecutionResult {
        testResults = List.copyOf(testResults);
    }
}
