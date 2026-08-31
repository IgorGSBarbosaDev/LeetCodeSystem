package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.api.ProblemNotFoundException;
import com.leetcode.leetcodesystem.problem.api.ProblemProgressResponse;
import com.leetcode.leetcodesystem.problem.api.ProblemResponseMapper;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProblemProgressService {

    private final ProblemRepository problemRepository;
    private final ProblemResponseMapper responseMapper;

    @PersistenceContext
    private EntityManager entityManager;

    public ProblemProgressService(ProblemRepository problemRepository, ProblemResponseMapper responseMapper) {
        this.problemRepository = problemRepository;
        this.responseMapper = responseMapper;
    }

    @Transactional
    public ProblemProgressResponse update(String problemId, Boolean favorite, Boolean reviewRequired) {
        ProblemEntity problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ProblemNotFoundException(problemId));
        ProblemProgressEntity progress = problem.getProgress();
        if (progress == null) {
            progress = new ProblemProgressEntity(problem);
            entityManager.persist(progress);
            problem.setProgress(progress);
        }
        progress.updatePreferences(favorite, reviewRequired);
        return responseMapper.toProgress(progress);
    }
}
