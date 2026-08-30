package com.leetcode.leetcodesystem.problem.api;

import tools.jackson.databind.JsonNode;

public record PublicTestCaseResponse(JsonNode input, JsonNode expectedOutput, boolean hidden) {
}
