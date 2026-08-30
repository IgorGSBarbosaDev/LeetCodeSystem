package com.leetcode.leetcodesystem.problem.judge;

public record JudgeTestResult(
        int index,
        boolean hidden,
        JudgeStatus status,
        String inputJson,
        String expectedOutputJson,
        String actualOutputJson,
        long executionTimeMs,
        String error
) {
}
