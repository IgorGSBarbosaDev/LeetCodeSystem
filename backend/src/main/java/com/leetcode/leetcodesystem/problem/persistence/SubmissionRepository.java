package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import com.leetcode.leetcodesystem.problem.judge.JudgeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<SubmissionEntity, String> {

    @Query("""
            select s.id as id,
                   p.id as problemId,
                   p.title as problemTitle,
                   s.status as status,
                   s.testsPassed as testsPassed,
                   s.totalTests as totalTests,
                   s.executionTimeMs as executionTimeMs,
                   s.submittedAt as submittedAt
            from SubmissionEntity s
            join s.problem p
            where (:problemId is null or p.id = :problemId)
              and (:status is null or s.status = :status)
            order by s.submittedAt desc, s.id desc
            """)
    Page<SubmissionSummaryProjection> searchSummaries(
            @Param("problemId") String problemId,
            @Param("status") JudgeStatus status,
            Pageable pageable
    );

    interface SubmissionSummaryProjection {
        String getId();

        String getProblemId();

        String getProblemTitle();

        JudgeStatus getStatus();

        int getTestsPassed();

        int getTotalTests();

        long getExecutionTimeMs();

        java.time.Instant getSubmittedAt();
    }
}
