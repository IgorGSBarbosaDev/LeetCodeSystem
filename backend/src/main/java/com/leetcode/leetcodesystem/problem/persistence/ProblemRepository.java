package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemRepository extends JpaRepository<ProblemEntity, String> {
}
