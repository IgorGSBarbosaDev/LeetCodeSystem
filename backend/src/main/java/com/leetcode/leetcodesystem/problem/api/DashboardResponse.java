package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.Difficulty;

import java.util.List;

public record DashboardResponse(
        Summary summary,
        List<DifficultyBreakdown> byDifficulty,
        List<CategoryBreakdown> byCategory,
        List<SubmissionSummaryResponse> recentSubmissions
) {
    public record Summary(
            int totalProblems,
            int solvedProblems,
            int remainingProblems,
            int attemptedProblems,
            int completionPercentage,
            int favoriteProblems,
            int reviewProblems
    ) {
    }

    public record DifficultyBreakdown(
            Difficulty difficulty,
            int totalProblems,
            int solvedProblems,
            int completionPercentage
    ) {
    }

    public record CategoryBreakdown(
            String category,
            int totalProblems,
            int solvedProblems,
            int completionPercentage
    ) {
    }
}
