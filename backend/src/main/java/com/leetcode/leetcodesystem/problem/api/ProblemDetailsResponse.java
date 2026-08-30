package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.Difficulty;

import java.util.List;

public record ProblemDetailsResponse(
        String id,
        String title,
        Difficulty difficulty,
        List<String> categories,
        String description,
        List<String> constraints,
        List<ExampleResponse> examples,
        MethodResponse method,
        String starterCode,
        List<PublicTestCaseResponse> testCases,
        int hiddenTestCaseCount,
        ProblemProgressResponse progress
) {
}
