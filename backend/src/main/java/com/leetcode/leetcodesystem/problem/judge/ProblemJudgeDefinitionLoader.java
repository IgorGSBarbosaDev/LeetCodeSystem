package com.leetcode.leetcodesystem.problem.judge;

import com.leetcode.leetcodesystem.problem.api.ProblemNotFoundException;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProblemJudgeDefinitionLoader {

    private final ProblemRepository problemRepository;

    public ProblemJudgeDefinitionLoader(ProblemRepository problemRepository) {
        this.problemRepository = problemRepository;
    }

    @Transactional(readOnly = true)
    public JudgeProblemDefinition load(String id, boolean includeHidden) {
        ProblemEntity problem = problemRepository.findById(id)
                .orElseThrow(() -> new ProblemNotFoundException(id));

        List<JudgeParameterDefinition> parameters = problem.getParameters().stream()
                .map(parameter -> new JudgeParameterDefinition(parameter.getName(), parameter.getType()))
                .toList();
        List<JudgeTestCaseDefinition> testCases = new ArrayList<>();
        problem.getTestCases().stream()
                .filter(testCase -> includeHidden || !testCase.isHidden())
                .forEach(testCase -> testCases.add(new JudgeTestCaseDefinition(
                        testCases.size(),
                        testCase.isHidden(),
                        testCase.getInputJson(),
                        testCase.getExpectedOutputJson()
                )));

        return new JudgeProblemDefinition(
                problem.getMethodName(),
                problem.getReturnType(),
                parameters,
                testCases
        );
    }
}
