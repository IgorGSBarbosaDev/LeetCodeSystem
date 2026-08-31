package com.leetcode.leetcodesystem.problem.api;

public class SubmissionNotFoundException extends RuntimeException {

    public SubmissionNotFoundException(String id) {
        super("A submissão " + id + " não foi encontrada.");
    }
}
