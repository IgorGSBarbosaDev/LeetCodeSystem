package com.leetcode.leetcodesystem.problem.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "problems")
public class ProblemEntity {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Difficulty difficulty;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "method_name", nullable = false, length = 100)
    private String methodName;

    @Column(name = "return_type", nullable = false, length = 40)
    private String returnType;

    @Column(name = "starter_code", nullable = false, columnDefinition = "TEXT")
    private String starterCode;

    @Column(name = "solution_code", nullable = false, columnDefinition = "TEXT")
    private String solutionCode;

    @Column(name = "solution_explanation", nullable = false, columnDefinition = "TEXT")
    private String solutionExplanation;

    @Column(name = "time_complexity", nullable = false, length = 100)
    private String timeComplexity;

    @Column(name = "space_complexity", nullable = false, length = 100)
    private String spaceComplexity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "problem_categories",
            joinColumns = @JoinColumn(name = "problem_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    private Set<CategoryEntity> categories = new LinkedHashSet<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ProblemConstraintEntity> constraints = new ArrayList<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<ProblemExampleEntity> examples = new ArrayList<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<MethodParameterEntity> parameters = new ArrayList<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<TestCaseEntity> testCases = new ArrayList<>();

    @OneToOne(mappedBy = "problem", cascade = CascadeType.REMOVE, orphanRemoval = true, fetch = FetchType.LAZY)
    private ProblemProgressEntity progress;

    protected ProblemEntity() {
    }

    public ProblemEntity(
            String id,
            String title,
            Difficulty difficulty,
            String description,
            String methodName,
            String returnType,
            String starterCode,
            String solutionCode,
            String solutionExplanation,
            String timeComplexity,
            String spaceComplexity
    ) {
        this.id = id;
        this.title = title;
        this.difficulty = difficulty;
        this.description = description;
        this.methodName = methodName;
        this.returnType = returnType;
        this.starterCode = starterCode;
        this.solutionCode = solutionCode;
        this.solutionExplanation = solutionExplanation;
        this.timeComplexity = timeComplexity;
        this.spaceComplexity = spaceComplexity;
        this.createdAt = Instant.now();
    }

    public void addCategory(CategoryEntity category) {
        categories.add(category);
    }

    public void addConstraint(ProblemConstraintEntity constraint) {
        constraints.add(constraint);
    }

    public void addExample(ProblemExampleEntity example) {
        examples.add(example);
    }

    public void addParameter(MethodParameterEntity parameter) {
        parameters.add(parameter);
    }

    public void addTestCase(TestCaseEntity testCase) {
        testCases.add(testCase);
    }

    public void setProgress(ProblemProgressEntity progress) {
        this.progress = progress;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public String getDescription() {
        return description;
    }

    public String getMethodName() {
        return methodName;
    }

    public String getReturnType() {
        return returnType;
    }

    public String getStarterCode() {
        return starterCode;
    }

    public Set<CategoryEntity> getCategories() {
        return categories;
    }

    public List<ProblemConstraintEntity> getConstraints() {
        return constraints;
    }

    public List<ProblemExampleEntity> getExamples() {
        return examples;
    }

    public List<MethodParameterEntity> getParameters() {
        return parameters;
    }

    public List<TestCaseEntity> getTestCases() {
        return testCases;
    }

    public ProblemProgressEntity getProgress() {
        return progress;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
