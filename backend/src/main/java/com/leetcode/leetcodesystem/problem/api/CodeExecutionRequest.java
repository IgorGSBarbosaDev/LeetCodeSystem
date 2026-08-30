package com.leetcode.leetcodesystem.problem.api;

import jakarta.validation.constraints.NotBlank;

public record CodeExecutionRequest(@NotBlank String code) {
}
