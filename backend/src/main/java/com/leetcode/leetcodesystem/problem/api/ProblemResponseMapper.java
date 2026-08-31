package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.CategoryEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import com.leetcode.leetcodesystem.problem.domain.TestCaseEntity;
import org.springframework.stereotype.Component;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.Comparator;
import java.util.List;

@Component
public class ProblemResponseMapper {

    private final JsonMapper mapper;

    public ProblemResponseMapper(JsonMapper problemPackageJsonMapper) {
        this.mapper = problemPackageJsonMapper;
    }

    public ProblemSummaryResponse toSummary(ProblemEntity problem) {
        return new ProblemSummaryResponse(
                problem.getId(),
                problem.getTitle(),
                problem.getDifficulty(),
                categories(problem),
                toProgress(problem.getProgress())
        );
    }

    public ProblemDetailsResponse toDetails(ProblemEntity problem) {
        List<PublicTestCaseResponse> publicTestCases = problem.getTestCases().stream()
                .filter(testCase -> !testCase.isHidden())
                .map(this::toPublicTestCase)
                .toList();
        int hiddenTestCases = (int) problem.getTestCases().stream().filter(TestCaseEntity::isHidden).count();

        return new ProblemDetailsResponse(
                problem.getId(),
                problem.getTitle(),
                problem.getDifficulty(),
                categories(problem),
                problem.getDescription(),
                problem.getConstraints().stream().map(constraint -> constraint.getText()).toList(),
                problem.getExamples().stream()
                        .map(example -> new ExampleResponse(example.getInput(), example.getOutput(), example.getExplanation()))
                        .toList(),
                new MethodResponse(
                        problem.getMethodName(),
                        problem.getReturnType(),
                        problem.getParameters().stream()
                                .map(parameter -> new MethodParameterResponse(parameter.getName(), parameter.getType()))
                                .toList()
                ),
                problem.getStarterCode(),
                publicTestCases,
                hiddenTestCases,
                toProgress(problem.getProgress())
        );
    }

    public ProblemProgressResponse toProgress(ProblemProgressEntity progress) {
        return toProgressResponse(progress);
    }

    private List<String> categories(ProblemEntity problem) {
        return problem.getCategories().stream()
                .map(CategoryEntity::getName)
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    private ProblemProgressResponse toProgressResponse(ProblemProgressEntity progress) {
        if (progress == null) {
            return new ProblemProgressResponse(
                    com.leetcode.leetcodesystem.problem.domain.ProgressStatus.NOT_STARTED,
                    0,
                    false,
                    false
            );
        }
        return new ProblemProgressResponse(
                progress.getEffectiveStatus(),
                progress.getAttempts(),
                progress.isFavorite(),
                progress.isReviewRequired()
        );
    }

    private PublicTestCaseResponse toPublicTestCase(TestCaseEntity testCase) {
        try {
            JsonNode input = mapper.readTree(testCase.getInputJson());
            JsonNode expectedOutput = mapper.readTree(testCase.getExpectedOutputJson());
            return new PublicTestCaseResponse(input, expectedOutput, false);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Caso de teste persistido contém JSON inválido.", exception);
        }
    }
}
