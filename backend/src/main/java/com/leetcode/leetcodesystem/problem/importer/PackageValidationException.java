package com.leetcode.leetcodesystem.problem.importer;

import java.util.List;

public class PackageValidationException extends RuntimeException {

    private final List<ValidationErrorDetail> errors;

    public PackageValidationException(List<ValidationErrorDetail> errors) {
        super("O pacote contém erros de validação.");
        this.errors = List.copyOf(errors);
    }

    public List<ValidationErrorDetail> getErrors() {
        return errors;
    }
}
