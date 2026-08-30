package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class ProblemQueryService {

    private final ProblemRepository problemRepository;
    private final ProblemResponseMapper responseMapper;

    public ProblemQueryService(ProblemRepository problemRepository, ProblemResponseMapper responseMapper) {
        this.problemRepository = problemRepository;
        this.responseMapper = responseMapper;
    }

    @Transactional(readOnly = true)
    public List<ProblemSummaryResponse> findAll() {
        return problemRepository.findAll().stream()
                .sorted(Comparator.comparing(ProblemEntity::getTitle, String.CASE_INSENSITIVE_ORDER))
                .map(responseMapper::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProblemDetailsResponse findById(String id) {
        return problemRepository.findById(id)
                .map(responseMapper::toDetails)
                .orElseThrow(() -> new ProblemNotFoundException(id));
    }
}
