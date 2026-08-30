package com.leetcode.leetcodesystem.problem.importer;

import java.util.List;

public class PackageConflictException extends RuntimeException {

    private final List<String> problemIds;

    public PackageConflictException(List<String> problemIds) {
        super("Um ou mais IDs do pacote já existem no banco de dados.");
        this.problemIds = List.copyOf(problemIds);
    }

    public List<String> getProblemIds() {
        return problemIds;
    }
}
