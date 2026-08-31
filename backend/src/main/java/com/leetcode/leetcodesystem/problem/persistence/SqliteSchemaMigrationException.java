package com.leetcode.leetcodesystem.problem.persistence;

/**
 * Signals that the on-disk SQLite schema cannot be migrated safely.
 *
 * <p>The application deliberately refuses to mutate an unrecognised schema;
 * operators must inspect and migrate such databases manually.</p>
 */
public class SqliteSchemaMigrationException extends IllegalStateException {
    public SqliteSchemaMigrationException(String message) {
        super(message);
    }

    public SqliteSchemaMigrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
