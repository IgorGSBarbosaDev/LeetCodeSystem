package com.leetcode.leetcodesystem.problem.api;

import java.util.List;

public record MethodResponse(
        String name,
        String returnType,
        List<MethodParameterResponse> parameters
) {
}
