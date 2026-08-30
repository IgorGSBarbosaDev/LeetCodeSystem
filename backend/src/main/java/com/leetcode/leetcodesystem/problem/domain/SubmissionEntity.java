package com.leetcode.leetcodesystem.problem.domain;

import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "submissions")
public class SubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false)
    private ProblemEntity problem;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private JudgeStatus status;

    @Column(name = "tests_passed", nullable = false)
    private int testsPassed;

    @Column(name = "total_tests", nullable = false)
    private int totalTests;

    @Column(name = "execution_time_ms", nullable = false)
    private long executionTimeMs;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    protected SubmissionEntity() {
    }

    public SubmissionEntity(
            ProblemEntity problem,
            String code,
            JudgeStatus status,
            int testsPassed,
            int totalTests,
            long executionTimeMs,
            Instant submittedAt
    ) {
        this.problem = problem;
        this.code = code;
        this.status = status;
        this.testsPassed = testsPassed;
        this.totalTests = totalTests;
        this.executionTimeMs = executionTimeMs;
        this.submittedAt = submittedAt;
    }

    public String getId() {
        return id;
    }

    public ProblemEntity getProblem() {
        return problem;
    }

    public String getCode() {
        return code;
    }

    public JudgeStatus getStatus() {
        return status;
    }

    public int getTestsPassed() {
        return testsPassed;
    }

    public int getTotalTests() {
        return totalTests;
    }

    public long getExecutionTimeMs() {
        return executionTimeMs;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }
}
