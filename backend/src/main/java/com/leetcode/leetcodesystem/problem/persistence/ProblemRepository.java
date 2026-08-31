package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProblemRepository extends JpaRepository<ProblemEntity, String> {

    @EntityGraph(attributePaths = {"categories", "progress"})
    @Query("select distinct p from ProblemEntity p")
    List<ProblemEntity> findAllWithProgressAndCategories();
}
