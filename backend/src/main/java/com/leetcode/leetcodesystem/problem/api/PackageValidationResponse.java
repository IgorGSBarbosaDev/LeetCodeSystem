package com.leetcode.leetcodesystem.problem.api;

import java.util.List;

public record PackageValidationResponse(
        String schemaVersion,
        int problemCount,
        List<ProblemImportSummaryResponse> problems
) {
}
