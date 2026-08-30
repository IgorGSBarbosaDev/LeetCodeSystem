package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemProgressRepository extends JpaRepository<ProblemProgressEntity, Long> {
}
