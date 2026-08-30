package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;

import java.util.List;

public record CodeExecutionResponse(
        JudgeStatus status,
        int testsPassed,
        int totalTests,
        long executionTimeMs,
        List<TestExecutionResponse> testResults,
        String compilationError,
        String runtimeError
) {
}
