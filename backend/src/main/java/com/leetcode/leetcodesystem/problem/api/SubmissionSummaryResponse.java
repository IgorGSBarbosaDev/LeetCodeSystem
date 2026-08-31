package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;

import java.time.Instant;

public record SubmissionSummaryResponse(
        String id,
        String problemId,
        String problemTitle,
        JudgeStatus status,
        int testsPassed,
        int totalTests,
        long executionTimeMs,
        Instant submittedAt
) {
}
