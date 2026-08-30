package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ProblemImportDto(
        @NotBlank
        @Size(min = 3, max = 100)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
        String id,
        @NotBlank String title,
        @NotBlank String difficulty,
        @NotNull @Size(min = 1, max = 10) List<@NotBlank String> categories,
        @NotBlank String description,
        @NotNull @Size(min = 1) List<@NotBlank String> constraints,
        @NotNull @Size(min = 1) List<@NotNull @Valid ExampleImportDto> examples,
        @NotNull @Valid MethodImportDto method,
        @NotNull @Valid StarterCodeImportDto starterCode,
        @NotNull @Size(min = 2, max = 100) List<@NotNull @Valid TestCaseImportDto> testCases,
        @NotNull @Valid SolutionImportDto solution
) {
}
