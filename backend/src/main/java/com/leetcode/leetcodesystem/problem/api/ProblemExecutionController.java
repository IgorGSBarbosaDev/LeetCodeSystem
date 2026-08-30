package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.judge.ProblemExecutionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problems")
public class ProblemExecutionController {

    private final ProblemExecutionService executionService;
    private final CodeExecutionResponseMapper responseMapper;

    public ProblemExecutionController(
            ProblemExecutionService executionService,
            CodeExecutionResponseMapper responseMapper
    ) {
        this.executionService = executionService;
        this.responseMapper = responseMapper;
    }

    @PostMapping("/{id}/run")
    public CodeExecutionResponse run(
            @PathVariable String id,
            @Valid @RequestBody CodeExecutionRequest request
    ) {
        return responseMapper.toResponse(executionService.run(id, request.code()));
    }

    @PostMapping("/{id}/submit")
    public CodeExecutionResponse submit(
            @PathVariable String id,
            @Valid @RequestBody CodeExecutionRequest request
    ) {
        return responseMapper.toResponse(executionService.submit(id, request.code()));
    }
}
