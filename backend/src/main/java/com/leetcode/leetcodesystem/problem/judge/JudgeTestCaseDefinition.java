package com.leetcode.leetcodesystem.problem.judge;

public record JudgeTestCaseDefinition(
        int index,
        boolean hidden,
        String inputJson,
        String expectedOutputJson
) {
}
