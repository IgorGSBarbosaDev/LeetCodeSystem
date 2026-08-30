package com.leetcode.leetcodesystem.problem.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private final ProblemQueryService problemQueryService;

    public ProblemController(ProblemQueryService problemQueryService) {
        this.problemQueryService = problemQueryService;
    }

    @GetMapping
    public List<ProblemSummaryResponse> findAll() {
        return problemQueryService.findAll();
    }

    @GetMapping("/{id}")
    public ProblemDetailsResponse findById(@PathVariable String id) {
        return problemQueryService.findById(id);
    }
}
