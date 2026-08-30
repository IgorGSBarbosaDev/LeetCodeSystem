package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.constraints.NotNull;

import tools.jackson.databind.JsonNode;

public record TestCaseImportDto(
        @NotNull JsonNode input,
        @NotNull JsonNode expectedOutput,
        @NotNull Boolean hidden
) {
}
