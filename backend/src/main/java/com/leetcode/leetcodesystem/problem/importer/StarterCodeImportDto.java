package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.constraints.NotBlank;

public record StarterCodeImportDto(
        @NotBlank String java
) {
}
