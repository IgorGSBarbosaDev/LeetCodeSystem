package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.Difficulty;

import java.util.List;

public record ProblemImportSummaryResponse(
        String id,
        String title,
        Difficulty difficulty,
        List<String> categories,
        int publicTestCases,
        int hiddenTestCases
) {
}
