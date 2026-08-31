package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.importer.PackageConflictException;
import com.leetcode.leetcodesystem.problem.importer.PackageFileTooLargeException;
import com.leetcode.leetcodesystem.problem.importer.PackageValidationException;
import com.leetcode.leetcodesystem.problem.importer.ValidationErrorDetail;
import com.leetcode.leetcodesystem.problem.judge.RunnerUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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

    @ExceptionHandler(RunnerUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleRunnerUnavailable(RunnerUnavailableException exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiErrorResponse(
                "RUNNER_UNAVAILABLE",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler(InvalidProgressUpdateException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidProgress(InvalidProgressUpdateException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "INVALID_PROGRESS_UPDATE",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler(InvalidSubmissionQueryException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidSubmissionQuery(InvalidSubmissionQueryException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "INVALID_SUBMISSION_QUERY",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler(SubmissionNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleSubmissionNotFound(SubmissionNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(
                "SUBMISSION_NOT_FOUND",
                exception.getMessage(),
                List.of()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request
    ) {
        boolean submissionQuery = request.getRequestURI().equals("/api/submissions");
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                submissionQuery ? "INVALID_SUBMISSION_QUERY" : "INVALID_REQUEST",
                "Parâmetro inválido: " + exception.getName() + ".",
                List.of()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(MethodArgumentNotValidException exception) {
        List<ValidationErrorDetail> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ValidationErrorDetail(error.getField(), error.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                "CODE_REQUIRED",
                "O campo code é obrigatório e não pode ficar em branco.",
                errors
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableRequest(
            HttpMessageNotReadableException exception,
            HttpServletRequest request
    ) {
        boolean progressUpdate = request.getRequestURI().matches("/api/problems/[^/]+/progress");
        return ResponseEntity.badRequest().body(new ApiErrorResponse(
                progressUpdate ? "INVALID_PROGRESS_UPDATE" : "CODE_REQUIRED",
                progressUpdate ? "Envie um objeto JSON com favorite e/ou reviewRequired." : "Envie um corpo JSON com o campo code.",
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
