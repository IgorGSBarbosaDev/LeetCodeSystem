package com.leetcode.leetcodesystem.problem.judge;

import org.springframework.stereotype.Service;

@Service
public class ProblemExecutionService {

    private final ProblemJudgeDefinitionLoader definitionLoader;
    private final JavaRunner javaRunner;

    public ProblemExecutionService(
            ProblemJudgeDefinitionLoader definitionLoader,
            JavaRunner javaRunner
    ) {
        this.definitionLoader = definitionLoader;
        this.javaRunner = javaRunner;
    }

    public JudgeExecutionResult run(String problemId, String code) {
        return execute(problemId, code, false);
    }

    public JudgeExecutionResult submit(String problemId, String code) {
        return execute(problemId, code, true);
    }

    private JudgeExecutionResult execute(String problemId, String code, boolean includeHidden) {
        JudgeProblemDefinition definition = definitionLoader.load(problemId, includeHidden);
        return javaRunner.execute(definition, code);
    }
}
