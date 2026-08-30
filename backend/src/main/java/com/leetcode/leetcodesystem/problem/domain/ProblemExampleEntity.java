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
@Table(name = "problem_examples")
public class ProblemExampleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false)
    private ProblemEntity problem;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String input;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String output;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    protected ProblemExampleEntity() {
    }

    public ProblemExampleEntity(ProblemEntity problem, int position, String input, String output, String explanation) {
        this.problem = problem;
        this.position = position;
        this.input = input;
        this.output = output;
        this.explanation = explanation;
    }

    public String getInput() {
        return input;
    }

    public String getOutput() {
        return output;
    }

    public String getExplanation() {
        return explanation;
    }
}
