package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProblemPackageImportDto(
        @NotBlank
        @Pattern(regexp = "1\\.0")
        String schemaVersion,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid ProblemImportDto> problems
) {
}
