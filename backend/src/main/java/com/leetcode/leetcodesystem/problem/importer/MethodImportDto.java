package com.leetcode.leetcodesystem.problem.importer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MethodImportDto(
        @NotBlank String name,
        @NotBlank String returnType,
        @NotNull @Size(max = 10) List<@NotNull @Valid MethodParameterImportDto> parameters
) {
}
