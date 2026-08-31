package com.leetcode.leetcodesystem.problem;

import com.leetcode.leetcodesystem.problem.persistence.SqliteSchemaMigration;
import com.leetcode.leetcodesystem.problem.persistence.SqliteSchemaMigrationException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.transaction.PlatformTransactionManager;

import java.sql.DriverManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqliteSchemaMigrationTests {

    private SingleConnectionDataSource dataSource;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() throws Exception {
        dataSource = new SingleConnectionDataSource(DriverManager.getConnection("jdbc:sqlite::memory:"), true);
        jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("CREATE TABLE problem_constraints (id integer primary key, position integer not null, text TEXT not null, problem_id varchar(100) not null)");
        jdbcTemplate.execute("INSERT INTO problem_constraints(id, position, text, problem_id) VALUES (7, 0, 'limite', 'problem-1')");
        jdbcTemplate.execute("CREATE TABLE problem_progress (id integer primary key, attempts integer not null, favorite boolean not null, first_solved_at timestamp, last_attempt_at timestamp, review_required boolean not null, status varchar(20) not null, problem_id varchar(100) not null unique)");
        jdbcTemplate.execute("INSERT INTO problem_progress(id, attempts, favorite, first_solved_at, last_attempt_at, review_required, status, problem_id) VALUES (8, 2, 1, NULL, NULL, 1, 'REVIEW', 'problem-1')");
        jdbcTemplate.execute("CREATE TABLE submissions (id integer primary key, code TEXT not null, execution_time_ms bigint not null, status varchar(30) not null, submitted_at timestamp not null, tests_passed integer not null, total_tests integer not null, problem_id varchar(100) not null)");
        jdbcTemplate.execute("INSERT INTO submissions(id, code, execution_time_ms, status, submitted_at, tests_passed, total_tests, problem_id) VALUES (9, 'class Solution {}', 3, 'ACCEPTED', '2026-08-30T10:00:00Z', 1, 1, 'problem-1')");
        jdbcTemplate.execute("CREATE INDEX legacy_constraints_position_idx ON problem_constraints(position)");
        jdbcTemplate.execute("CREATE TRIGGER legacy_progress_touch AFTER UPDATE ON problem_progress BEGIN SELECT 1; END");
        jdbcTemplate.execute("PRAGMA user_version = 0");
    }

    @AfterEach
    void tearDown() {
        dataSource.destroy();
    }

    @Test
    void convertsLegacyIntegerIdsWithoutDroppingRowsOrProgressFlags() {
        new SqliteSchemaMigration(jdbcTemplate).run(new DefaultApplicationArguments(new String[0]));

        assertThat(jdbcTemplate.queryForObject(
                "SELECT type FROM pragma_table_info('problem_constraints') WHERE name = 'id'",
                String.class
        )).isEqualToIgnoringCase("varchar(36)");
        assertThat(jdbcTemplate.queryForObject("SELECT id || ':' || text FROM problem_constraints", String.class))
                .isEqualTo("7:limite");
        assertThat(jdbcTemplate.queryForObject("SELECT id || ':' || status || ':' || review_required FROM problem_progress", String.class))
                .isEqualTo("8:REVIEW:1");
        assertThat(jdbcTemplate.queryForObject("SELECT id || ':' || code FROM submissions", String.class))
                .isEqualTo("9:class Solution {}");
        assertThat(jdbcTemplate.queryForObject("PRAGMA user_version", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='legacy_constraints_position_idx'", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='legacy_progress_touch'", Integer.class)).isEqualTo(1);
    }

    @Test
    void isIdempotentAfterTheSchemaHasBeenConverted() {
        SqliteSchemaMigration migration = new SqliteSchemaMigration(jdbcTemplate);
        migration.run(new DefaultApplicationArguments(new String[0]));
        String firstSchema = jdbcTemplate.queryForObject("SELECT sql FROM sqlite_master WHERE type='table' AND name='problem_progress'", String.class);

        migration.run(new DefaultApplicationArguments(new String[0]));

        assertThat(jdbcTemplate.queryForObject("PRAGMA user_version", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT sql FROM sqlite_master WHERE type='table' AND name='problem_progress'", String.class))
                .isEqualTo(firstSchema);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM problem_progress", Integer.class)).isEqualTo(1);
    }

    @Test
    void refusesUnknownSchemaWithoutChangingTheDatabase() {
        jdbcTemplate.execute("ALTER TABLE problem_constraints ADD COLUMN unexpected TEXT");

        assertThatThrownBy(() -> new SqliteSchemaMigration(jdbcTemplate).run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(SqliteSchemaMigrationException.class);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT type FROM pragma_table_info('problem_constraints') WHERE name = 'id'",
                String.class
        )).isEqualToIgnoringCase("INTEGER");
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM problem_constraints", Integer.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("PRAGMA user_version", Integer.class)).isEqualTo(0);
    }

    @Test
    void rollsBackAllTablesWhenAConversionFails() {
        jdbcTemplate.execute("INSERT INTO problem_progress(id, attempts, favorite, first_solved_at, last_attempt_at, review_required, status, problem_id) VALUES (10, 1, 0, NULL, NULL, 0, 'INVALID', 'problem-2')");
        PlatformTransactionManager transactionManager = new DataSourceTransactionManager(dataSource);

        assertThatThrownBy(() -> new SqliteSchemaMigration(jdbcTemplate, transactionManager)
                .run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(RuntimeException.class);

        assertThat(jdbcTemplate.queryForObject(
                "SELECT type FROM pragma_table_info('problem_constraints') WHERE name = 'id'",
                String.class
        )).isEqualToIgnoringCase("INTEGER");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT type FROM pragma_table_info('problem_progress') WHERE name = 'id'",
                String.class
        )).isEqualToIgnoringCase("INTEGER");
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM problem_progress", Integer.class)).isEqualTo(2);
        assertThat(jdbcTemplate.queryForObject("PRAGMA user_version", Integer.class)).isEqualTo(0);
    }
}
