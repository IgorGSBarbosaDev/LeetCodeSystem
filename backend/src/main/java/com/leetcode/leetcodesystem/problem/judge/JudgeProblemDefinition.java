package com.leetcode.leetcodesystem.problem.judge;

import java.util.List;

public record JudgeProblemDefinition(
        String methodName,
        String returnType,
        List<JudgeParameterDefinition> parameters,
        List<JudgeTestCaseDefinition> testCases
) {
    public JudgeProblemDefinition {
        parameters = List.copyOf(parameters);
        testCases = List.copyOf(testCases);
    }
}
