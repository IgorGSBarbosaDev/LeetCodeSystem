package com.leetcode.leetcodesystem.problem.api;

public class ProblemNotFoundException extends RuntimeException {

    public ProblemNotFoundException(String id) {
        super("Exercício não encontrado: " + id);
    }
}
