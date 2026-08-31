package com.leetcode.leetcodesystem.problem.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "problem_progress")
public class ProblemProgressEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false, unique = true)
    private ProblemEntity problem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProgressStatus status;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean favorite;

    @Column(name = "review_required", nullable = false)
    private boolean reviewRequired;

    private Instant firstSolvedAt;
    private Instant lastAttemptAt;

    protected ProblemProgressEntity() {
    }

    public ProblemProgressEntity(ProblemEntity problem) {
        this.problem = problem;
        this.status = ProgressStatus.NOT_STARTED;
        this.attempts = 0;
        this.favorite = false;
        this.reviewRequired = false;
    }

    public ProgressStatus getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public Instant getFirstSolvedAt() {
        return firstSolvedAt;
    }

    public Instant getLastAttemptAt() {
        return lastAttemptAt;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public boolean isReviewRequired() {
        return reviewRequired;
    }

    /**
     * REVIEW was used by an earlier version as a status as well as a flag.
     * Keep reading those rows compatible while exposing the activity status
     * independently from the review marker.
     */
    public ProgressStatus getEffectiveStatus() {
        if (status != ProgressStatus.REVIEW) {
            return status;
        }
        return statusFromHistory();
    }

    public void updatePreferences(Boolean favorite, Boolean reviewRequired) {
        if (favorite != null) {
            this.favorite = favorite;
        }
        if (reviewRequired != null) {
            this.reviewRequired = reviewRequired;
        }
        normalizeLegacyReviewStatus();
    }

    public void recordSubmission(boolean accepted, Instant submittedAt) {
        normalizeLegacyReviewStatus();
        attempts++;
        lastAttemptAt = submittedAt;

        if (accepted) {
            status = ProgressStatus.SOLVED;
            if (firstSolvedAt == null) {
                firstSolvedAt = submittedAt;
            }
            return;
        }

        if (status == ProgressStatus.NOT_STARTED || status == ProgressStatus.ATTEMPTED) {
            status = ProgressStatus.ATTEMPTED;
        }
    }

    private void normalizeLegacyReviewStatus() {
        if (status == ProgressStatus.REVIEW) {
            status = statusFromHistory();
        }
    }

    private ProgressStatus statusFromHistory() {
        if (firstSolvedAt != null) {
            return ProgressStatus.SOLVED;
        }
        return attempts > 0 ? ProgressStatus.ATTEMPTED : ProgressStatus.NOT_STARTED;
    }
}
