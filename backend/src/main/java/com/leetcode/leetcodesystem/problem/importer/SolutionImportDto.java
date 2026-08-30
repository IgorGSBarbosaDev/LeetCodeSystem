package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.constraints.NotBlank;

public record SolutionImportDto(
        @NotBlank String java,
        @NotBlank String explanation,
        @NotBlank String timeComplexity,
        @NotBlank String spaceComplexity
) {
}
