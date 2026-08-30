package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.importer.ValidationErrorDetail;

import java.util.List;

public record ApiErrorResponse(
        String code,
        String message,
        List<ValidationErrorDetail> errors
) {
}
