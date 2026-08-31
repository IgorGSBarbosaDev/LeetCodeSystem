package com.leetcode.leetcodesystem.problem.api;

import java.util.List;

public record SubmissionPageResponse(
        List<SubmissionSummaryResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
