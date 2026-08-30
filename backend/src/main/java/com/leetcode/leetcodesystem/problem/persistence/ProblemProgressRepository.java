package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProblemProgressRepository extends JpaRepository<ProblemProgressEntity, String> {

    Optional<ProblemProgressEntity> findByProblemId(String problemId);
}
