package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.Difficulty;

import java.util.List;

public record ProblemSummaryResponse(
        String id,
        String title,
        Difficulty difficulty,
        List<String> categories,
        ProblemProgressResponse progress
) {
}
