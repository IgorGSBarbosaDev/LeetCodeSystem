package com.leetcode.leetcodesystem.problem.domain;

import java.util.Set;

public final class ProblemCategory {

    private ProblemCategory() {
    }

    public static final Set<String> ALLOWED = Set.of(
            "ARRAY",
            "STRING",
            "HASH_TABLE",
            "TWO_POINTERS",
            "SLIDING_WINDOW",
            "STACK",
            "QUEUE",
            "LINKED_LIST",
            "BINARY_SEARCH",
            "TREE",
            "BINARY_TREE",
            "BINARY_SEARCH_TREE",
            "HEAP",
            "GRAPH",
            "BACKTRACKING",
            "GREEDY",
            "DYNAMIC_PROGRAMMING",
            "RECURSION",
            "SORTING",
            "MATRIX",
            "BIT_MANIPULATION"
    );
}
