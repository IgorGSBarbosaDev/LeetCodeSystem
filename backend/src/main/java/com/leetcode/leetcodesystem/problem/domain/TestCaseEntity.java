package com.leetcode.leetcodesystem.problem.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "test_cases")
public class TestCaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false)
    private ProblemEntity problem;

    @Column(nullable = false)
    private int position;

    @Column(name = "input_json", nullable = false, columnDefinition = "TEXT")
    private String inputJson;

    @Column(name = "expected_output_json", nullable = false, columnDefinition = "TEXT")
    private String expectedOutputJson;

    @Column(nullable = false)
    private boolean hidden;

    protected TestCaseEntity() {
    }

    public TestCaseEntity(ProblemEntity problem, int position, String inputJson, String expectedOutputJson, boolean hidden) {
        this.problem = problem;
        this.position = position;
        this.inputJson = inputJson;
        this.expectedOutputJson = expectedOutputJson;
        this.hidden = hidden;
    }

    public String getInputJson() {
        return inputJson;
    }

    public String getExpectedOutputJson() {
        return expectedOutputJson;
    }

    public boolean isHidden() {
        return hidden;
    }
}
