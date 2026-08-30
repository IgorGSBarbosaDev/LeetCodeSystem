package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.judge.JudgeExecutionResult;
import com.leetcode.leetcodesystem.problem.judge.JudgeTestResult;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

@Component
public class CodeExecutionResponseMapper {

    private final JsonMapper mapper;

    public CodeExecutionResponseMapper(JsonMapper problemPackageJsonMapper) {
        this.mapper = problemPackageJsonMapper;
    }

    public CodeExecutionResponse toResponse(JudgeExecutionResult result) {
        return new CodeExecutionResponse(
                result.status(),
                result.testsPassed(),
                result.totalTests(),
                result.executionTimeMs(),
                result.testResults().stream().map(this::toTestResponse).toList(),
                result.compilationError(),
                result.runtimeError()
        );
    }

    private TestExecutionResponse toTestResponse(JudgeTestResult result) {
        return new TestExecutionResponse(
                result.index(),
                result.hidden(),
                result.status(),
                parse(result.inputJson()),
                parse(result.expectedOutputJson()),
                parse(result.actualOutputJson()),
                result.executionTimeMs(),
                result.error()
        );
    }

    private JsonNode parse(String json) {
        if (json == null) {
            return null;
        }
        try {
            return mapper.readTree(json);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Resultado do Java Runner contém JSON inválido.", exception);
        }
    }
}
