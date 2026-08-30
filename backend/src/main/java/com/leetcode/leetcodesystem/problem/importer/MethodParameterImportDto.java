package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.constraints.NotBlank;

public record MethodParameterImportDto(
        @NotBlank String name,
        @NotBlank String type
) {
}
