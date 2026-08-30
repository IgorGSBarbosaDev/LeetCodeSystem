package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.SubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<SubmissionEntity, String> {
}
