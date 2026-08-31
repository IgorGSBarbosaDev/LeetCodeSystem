package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.persistence.SubmissionQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    private final SubmissionQueryService queryService;

    public SubmissionController(SubmissionQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public SubmissionPageResponse search(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String problemId,
            @RequestParam(required = false) String status
    ) {
        return queryService.search(page, size, problemId, status);
    }

    @GetMapping("/{id}")
    public SubmissionDetailResponse findById(@PathVariable String id) {
        return queryService.findById(id);
    }
}
