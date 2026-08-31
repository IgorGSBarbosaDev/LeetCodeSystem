package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.api.InvalidSubmissionQueryException;
import com.leetcode.leetcodesystem.problem.api.ProblemNotFoundException;
import com.leetcode.leetcodesystem.problem.api.SubmissionDetailResponse;
import com.leetcode.leetcodesystem.problem.api.SubmissionNotFoundException;
import com.leetcode.leetcodesystem.problem.api.SubmissionPageResponse;
import com.leetcode.leetcodesystem.problem.api.SubmissionSummaryResponse;
import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class SubmissionQueryService {

    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;

    public SubmissionQueryService(SubmissionRepository submissionRepository, ProblemRepository problemRepository) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
    }

    @Transactional(readOnly = true)
    public SubmissionPageResponse search(int page, int size, String problemId, String statusValue) {
        validatePage(page, size);
        if (problemId != null && problemId.isBlank()) {
            problemId = null;
        }
        if (problemId != null && !problemRepository.existsById(problemId)) {
            throw new ProblemNotFoundException(problemId);
        }
        JudgeStatus status = parseStatus(statusValue);
        Page<SubmissionRepository.SubmissionSummaryProjection> result = submissionRepository.searchSummaries(
                problemId,
                status,
                PageRequest.of(page, size)
        );
        return new SubmissionPageResponse(
                result.getContent().stream().map(this::toSummary).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public SubmissionDetailResponse findById(String id) {
        SubmissionEntity submission = submissionRepository.findById(id)
                .orElseThrow(() -> new SubmissionNotFoundException(id));
        return new SubmissionDetailResponse(
                submission.getId(),
                submission.getProblem().getId(),
                submission.getProblem().getTitle(),
                submission.getStatus(),
                submission.getTestsPassed(),
                submission.getTotalTests(),
                submission.getExecutionTimeMs(),
                submission.getSubmittedAt(),
                submission.getCode()
        );
    }

    @Transactional(readOnly = true)
    public java.util.List<SubmissionSummaryResponse> recent(int limit) {
        Page<SubmissionRepository.SubmissionSummaryProjection> result = submissionRepository.searchSummaries(
                null,
                null,
                PageRequest.of(0, limit)
        );
        return result.getContent().stream().map(this::toSummary).toList();
    }

    private void validatePage(int page, int size) {
        if (page < 0) {
            throw new InvalidSubmissionQueryException("page deve ser maior ou igual a zero.");
        }
        if (size < 1 || size > 100) {
            throw new InvalidSubmissionQueryException("size deve estar entre 1 e 100.");
        }
    }

    private JudgeStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return JudgeStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new InvalidSubmissionQueryException("status de submissão inválido: " + value + ".");
        }
    }

    private SubmissionSummaryResponse toSummary(SubmissionRepository.SubmissionSummaryProjection projection) {
        return new SubmissionSummaryResponse(
                projection.getId(),
                projection.getProblemId(),
                projection.getProblemTitle(),
                projection.getStatus(),
                projection.getTestsPassed(),
                projection.getTotalTests(),
                projection.getExecutionTimeMs(),
                projection.getSubmittedAt()
        );
    }
}
