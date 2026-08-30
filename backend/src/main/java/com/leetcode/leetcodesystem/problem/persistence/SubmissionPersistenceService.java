package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.api.ProblemNotFoundException;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import com.leetcode.leetcodesystem.problem.judge.JudgeExecutionResult;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class SubmissionPersistenceService {

    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public SubmissionPersistenceService(
            ProblemRepository problemRepository,
            SubmissionRepository submissionRepository
    ) {
        this.problemRepository = problemRepository;
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public void record(String problemId, String code, JudgeExecutionResult result) {
        ProblemEntity problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ProblemNotFoundException(problemId));
        Instant submittedAt = Instant.now();

        submissionRepository.save(new SubmissionEntity(
                problem,
                code,
                result.status(),
                result.testsPassed(),
                result.totalTests(),
                result.executionTimeMs(),
                submittedAt
        ));

        ProblemProgressEntity progress = problem.getProgress();
        if (progress == null) {
            progress = new ProblemProgressEntity(problem);
            entityManager.persist(progress);
            problem.setProgress(progress);
        }
        progress.recordSubmission(result.status() == JudgeStatus.ACCEPTED, submittedAt);
    }
}
