package com.leetcode.leetcodesystem.problem.importer;

public class PackageFileTooLargeException extends RuntimeException {

    public PackageFileTooLargeException() {
        super("O arquivo excede o limite máximo de 5 MiB.");
    }
}
