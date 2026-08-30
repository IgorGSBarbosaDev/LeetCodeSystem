package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.ProgressStatus;

public record ProblemProgressResponse(
        ProgressStatus status,
        int attempts,
        boolean favorite,
        boolean reviewRequired
) {
}
