package com.leetcode.leetcodesystem.problem.judge;

import com.leetcode.leetcodesystem.problem.persistence.SubmissionPersistenceService;
import org.springframework.stereotype.Service;

@Service
public class ProblemExecutionService {

    private final ProblemJudgeDefinitionLoader definitionLoader;
    private final JavaRunner javaRunner;
    private final SubmissionPersistenceService submissionPersistenceService;

    public ProblemExecutionService(
            ProblemJudgeDefinitionLoader definitionLoader,
            JavaRunner javaRunner,
            SubmissionPersistenceService submissionPersistenceService
    ) {
        this.definitionLoader = definitionLoader;
        this.javaRunner = javaRunner;
        this.submissionPersistenceService = submissionPersistenceService;
    }

    public JudgeExecutionResult run(String problemId, String code) {
        return execute(problemId, code, false);
    }

    public JudgeExecutionResult submit(String problemId, String code) {
        JudgeExecutionResult result = execute(problemId, code, true);
        submissionPersistenceService.record(problemId, code, result);
        return result;
    }

    private JudgeExecutionResult execute(String problemId, String code, boolean includeHidden) {
        JudgeProblemDefinition definition = definitionLoader.load(problemId, includeHidden);
        return javaRunner.execute(definition, code);
    }
}
