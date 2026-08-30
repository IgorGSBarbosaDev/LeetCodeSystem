package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.importer.PackageConflictException;
import com.leetcode.leetcodesystem.problem.importer.PackageFileTooLargeException;
import com.leetcode.leetcodesystem.problem.importer.PackageValidationException;
import com.leetcode.leetcodesystem.problem.importer.ValidationErrorDetail;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.List;

@RestControllerAdvice
public class ProblemApiExceptionHandler {

    @ExceptionHandler(PackageValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(PackageValidationException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "PACKAGE_VALIDATION_FAILED",
                exception.getMessage(),
                exception.getErrors()
        ));
    }

    @ExceptionHandler(PackageConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(PackageConflictException exception) {
        List<ValidationErrorDetail> errors = exception.getProblemIds().stream()
                .map(id -> new ValidationErrorDetail("problems[id=" + id + "].id", "O ID já existe no banco de dados."))
                .toList();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(
                "PROBLEM_ID_ALREADY_EXISTS",
                exception.getMessage(),
                errors
        ));
    }

    @ExceptionHandler(PackageFileTooLargeException.class)
    public ResponseEntity<ApiErrorResponse> handleTooLarge(PackageFileTooLargeException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ApiErrorResponse(
                "PACKAGE_FILE_TOO_LARGE",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMultipartTooLarge(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ApiErrorResponse(
                "PACKAGE_FILE_TOO_LARGE",
                "O arquivo excede o limite máximo de 5 MiB.",
                List.of()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(
                "PACKAGE_CONFLICT",
                "A importação entrou em conflito com dados já persistidos e foi cancelada.",
                List.of()
        ));
    }

    @ExceptionHandler(ProblemNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ProblemNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(
                "PROBLEM_NOT_FOUND",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler({MissingServletRequestPartException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiErrorResponse> handleMissingFile(Exception exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "FILE_REQUIRED",
                "Envie o arquivo na parte multipart chamada file.",
                List.of()
        ));
    }
}
