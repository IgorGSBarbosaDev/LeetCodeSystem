package com.leetcode.leetcodesystem.problem.persistence;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Converts the first MVP's integer child-table IDs to the UUID string contract.
 * SQLite cannot alter a primary-key type in place, therefore the conversion is
 * performed only after a complete preflight and in one transaction.
 */
@Component
public class SqliteSchemaMigration implements ApplicationRunner {
    private static final int CURRENT_SCHEMA_VERSION = 1;
    private static final List<TableSpec> TABLES = List.of(
            new TableSpec("problem_constraints", Set.of("id", "position", "text", "problem_id"),
                    "id varchar(36) primary key, position integer not null, text TEXT not null, problem_id varchar(100) not null",
                    "position, text, problem_id", 0, 0),
            new TableSpec("problem_examples", Set.of("id", "explanation", "input", "output", "position", "problem_id"),
                    "id varchar(36) primary key, explanation TEXT, input TEXT not null, output TEXT not null, position integer not null, problem_id varchar(100) not null",
                    "explanation, input, output, position, problem_id", 0, 0),
            new TableSpec("method_parameters", Set.of("id", "name", "position", "type", "problem_id"),
                    "id varchar(36) primary key, name varchar(100) not null, position integer not null, type varchar(40) not null, problem_id varchar(100) not null",
                    "name, position, type, problem_id", 0, 0),
            new TableSpec("test_cases", Set.of("id", "expected_output_json", "hidden", "input_json", "position", "problem_id"),
                    "id varchar(36) primary key, expected_output_json TEXT not null, hidden boolean not null, input_json TEXT not null, position integer not null, problem_id varchar(100) not null",
                    "expected_output_json, hidden, input_json, position, problem_id", 0, 0),
            new TableSpec("submissions", Set.of("id", "code", "execution_time_ms", "status", "submitted_at", "tests_passed", "total_tests", "problem_id"),
                    "id varchar(36) primary key, code TEXT not null, execution_time_ms bigint not null, status varchar(30) not null check (status in ('ACCEPTED','WRONG_ANSWER','COMPILATION_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED')), submitted_at timestamp not null, tests_passed integer not null, total_tests integer not null, problem_id varchar(100) not null",
                    "code, execution_time_ms, status, submitted_at, tests_passed, total_tests, problem_id", -1, 0),
            new TableSpec("problem_progress", Set.of("id", "attempts", "favorite", "first_solved_at", "last_attempt_at", "review_required", "status", "problem_id"),
                    "id varchar(36) primary key, attempts integer not null, favorite boolean not null, first_solved_at timestamp, last_attempt_at timestamp, review_required boolean not null, status varchar(20) not null check (status in ('NOT_STARTED','ATTEMPTED','SOLVED','REVIEW')), problem_id varchar(100) not null unique",
                    "attempts, favorite, first_solved_at, last_attempt_at, review_required, status, problem_id", -1, 1)
    );

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    /** Constructor retained for focused unit tests using a single connection. */
    public SqliteSchemaMigration(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, new DataSourceTransactionManager(jdbcTemplate.getDataSource()));
    }

    @Autowired
    public SqliteSchemaMigration(JdbcTemplate jdbcTemplate, PlatformTransactionManager transactionManager) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionManager == null ? null : new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isSqlite()) {
            return;
        }
        if (transactionTemplate == null) {
            migrateSafely();
        } else {
            transactionTemplate.executeWithoutResult(status -> migrateSafely());
        }
    }

    private boolean isSqlite() {
        try {
            jdbcTemplate.queryForObject("select sqlite_version()", String.class);
            return true;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private void migrateSafely() {
        int version = jdbcTemplate.queryForObject("PRAGMA user_version", Integer.class);
        if (version > CURRENT_SCHEMA_VERSION) {
            throw new SqliteSchemaMigrationException("Versão SQLite " + version + " não é suportada; migração manual necessária.");
        }

        List<PlannedTable> plan = preflight();
        boolean hasLegacyTables = plan.stream().anyMatch(PlannedTable::legacy);
        if (version == CURRENT_SCHEMA_VERSION && hasLegacyTables) {
            throw new SqliteSchemaMigrationException("O banco informa a versão " + CURRENT_SCHEMA_VERSION + " mas ainda contém schema legado; migração manual necessária.");
        }
        if (!hasLegacyTables) {
            if (version < CURRENT_SCHEMA_VERSION) {
                jdbcTemplate.execute("PRAGMA user_version = " + CURRENT_SCHEMA_VERSION);
            }
            return;
        }

        for (PlannedTable table : plan) {
            migrateTable(table);
        }
        jdbcTemplate.execute("PRAGMA user_version = " + CURRENT_SCHEMA_VERSION);
    }

    /** Reads every table and all SQLite metadata before issuing any DDL. */
    private List<PlannedTable> preflight() {
        List<PlannedTable> plan = new ArrayList<>();
        for (TableSpec spec : TABLES) {
            if (!tableExists(spec.name())) {
                continue;
            }

            List<Map<String, Object>> columns = jdbcTemplate.queryForList("PRAGMA table_info('" + spec.name() + "')");
            Set<String> actualColumns = new HashSet<>();
            String idType = null;
            for (Map<String, Object> column : columns) {
                String name = String.valueOf(column.get("name")).toLowerCase(Locale.ROOT);
                actualColumns.add(name);
                if ("id".equals(name)) {
                    idType = String.valueOf(column.get("type"));
                }
            }
            if (!actualColumns.equals(spec.columns())) {
                throw unsafe(spec.name(), "colunas diferentes do schema conhecido");
            }
            String normalizedIdType = idType == null ? "" : idType.trim().toUpperCase(Locale.ROOT);
            boolean legacy = "INTEGER".equals(normalizedIdType);
            boolean current = normalizedIdType.contains("CHAR") || normalizedIdType.contains("CLOB") || normalizedIdType.contains("TEXT") || normalizedIdType.contains("VARCHAR");
            if (!legacy && !current) {
                throw unsafe(spec.name(), "tipo da coluna id não reconhecido: " + normalizedIdType);
            }

            String sql = tableSql(spec.name());
            if (sql.toUpperCase(Locale.ROOT).contains("WITHOUT ROWID")) {
                throw unsafe(spec.name(), "tabela WITHOUT ROWID não suportada");
            }
            int foreignKeys = jdbcTemplate.queryForList("PRAGMA foreign_key_list('" + spec.name() + "')").size();
            if (foreignKeys > 0) {
                throw unsafe(spec.name(), "chaves estrangeiras precisam de migração manual");
            }
            int checks = countCheckConstraints(sql);
            if (spec.expectedChecks() >= 0 && checks != spec.expectedChecks()) {
                throw unsafe(spec.name(), "constraints CHECK diferentes do schema conhecido");
            }
            if (spec.expectedChecks() < 0 && checks > 1) {
                throw unsafe(spec.name(), "constraints CHECK diferentes do schema conhecido");
            }
            int uniqueIndexes = countAutoUniqueIndexes(spec.name());
            if (uniqueIndexes != spec.expectedUniqueIndexes()) {
                throw unsafe(spec.name(), "constraints UNIQUE diferentes do schema conhecido");
            }
            List<SchemaObject> objects = jdbcTemplate.query("SELECT type, name, sql FROM sqlite_master WHERE tbl_name = ? AND type IN ('index','trigger') AND sql IS NOT NULL ORDER BY type, name",
                    (rs, rowNum) -> new SchemaObject(rs.getString("type"), rs.getString("name"), rs.getString("sql")), spec.name());
            plan.add(new PlannedTable(spec, legacy, objects));
        }
        return plan;
    }

    private void migrateTable(PlannedTable table) {
        if (!table.legacy()) {
            return;
        }
        String replacement = table.spec().name() + "_uuid_migration_v" + CURRENT_SCHEMA_VERSION;
        if (tableExists(replacement)) {
            throw unsafe(table.spec().name(), "objeto temporário de migração já existe: " + replacement);
        }
        jdbcTemplate.execute("CREATE TABLE " + replacement + " (" + table.spec().definition() + ")");
        String columns = "id, " + table.spec().copiedColumns();
        jdbcTemplate.execute("INSERT INTO " + replacement + " (" + columns + ") SELECT CAST(id AS TEXT), " + table.spec().copiedColumns() + " FROM " + table.spec().name());
        Integer sourceCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table.spec().name(), Integer.class);
        Integer copiedCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + replacement, Integer.class);
        Integer nullIds = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + replacement + " WHERE id IS NULL", Integer.class);
        Integer mismatchedIds = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table.spec().name() + " source LEFT JOIN " + replacement + " target ON target.id = CAST(source.id AS TEXT) WHERE target.id IS NULL", Integer.class);
        Integer mismatchedValues = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table.spec().name() + " source JOIN " + replacement + " target ON target.id = CAST(source.id AS TEXT) WHERE " + mismatchedValuesPredicate(table.spec()), Integer.class);
        if (!sourceCount.equals(copiedCount) || nullIds != 0 || mismatchedIds != 0 || mismatchedValues != 0) {
            throw unsafe(table.spec().name(), "validação da cópia de dados falhou");
        }
        jdbcTemplate.execute("DROP TABLE " + table.spec().name());
        jdbcTemplate.execute("ALTER TABLE " + replacement + " RENAME TO " + table.spec().name());
        for (SchemaObject object : table.objects()) {
            jdbcTemplate.execute(object.sql());
        }
    }

    private String tableSql(String table) {
        return jdbcTemplate.queryForObject("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", String.class, table);
    }

    private boolean tableExists(String table) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", Integer.class, table);
        return count != null && count > 0;
    }

    private int countCheckConstraints(String sql) {
        String upper = sql.toUpperCase(Locale.ROOT);
        int count = 0;
        int from = 0;
        while ((from = upper.indexOf("CHECK", from)) >= 0) {
            count++;
            from += 5;
        }
        return count;
    }

    private int countAutoUniqueIndexes(String table) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM pragma_index_list(?) WHERE origin='u'", Integer.class, table);
    }

    private String mismatchedValuesPredicate(TableSpec spec) {
        return List.of(spec.copiedColumns().split(", ")).stream()
                .map(column -> "NOT (source." + column + " IS target." + column + ")")
                .reduce((left, right) -> left + " OR " + right)
                .orElse("0");
    }

    private SqliteSchemaMigrationException unsafe(String table, String reason) {
        return new SqliteSchemaMigrationException("Schema SQLite não reconhecido para " + table + ": " + reason + ". Nenhuma alteração foi aplicada; migração manual necessária.");
    }

    private record TableSpec(String name, Set<String> columns, String definition, String copiedColumns,
                             int expectedChecks, int expectedUniqueIndexes) {}

    private record SchemaObject(String type, String name, String sql) {}

    private record PlannedTable(TableSpec spec, boolean legacy, List<SchemaObject> objects) {}
}
