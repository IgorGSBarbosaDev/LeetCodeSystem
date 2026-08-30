package com.leetcode.leetcodesystem.problem.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import tools.jackson.databind.JsonNode;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TestExecutionResponse(
        int index,
        boolean hidden,
        JudgeStatus status,
        JsonNode input,
        JsonNode expectedOutput,
        JsonNode actualOutput,
        long executionTimeMs,
        String error
) {
}
