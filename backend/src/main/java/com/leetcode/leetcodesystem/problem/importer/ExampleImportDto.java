package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.constraints.NotBlank;

public record ExampleImportDto(
        @NotBlank String input,
        @NotBlank String output,
        String explanation
) {
}
