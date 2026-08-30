package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {

    Optional<CategoryEntity> findByName(String name);
}
