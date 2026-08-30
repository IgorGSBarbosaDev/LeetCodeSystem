package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.domain.CategoryEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemCategory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CategorySeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    public CategorySeeder(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        ProblemCategory.ALLOWED.forEach(category ->
                categoryRepository.findByName(category).orElseGet(() -> categoryRepository.save(new CategoryEntity(category)))
        );
    }
}
