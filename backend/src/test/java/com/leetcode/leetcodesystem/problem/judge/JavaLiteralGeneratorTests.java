package com.leetcode.leetcodesystem.problem.judge;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class JavaLiteralGeneratorTests {

    private final JavaLiteralGenerator generator = new JavaLiteralGenerator();
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void generatesLiteralsForEverySupportedType() {
        assertThat(generator.expression(mapper.readTree("2147483647"), "int")).isEqualTo("Integer.valueOf(\"2147483647\")");
        assertThat(generator.expression(mapper.readTree("-9223372036854775808"), "long")).isEqualTo("Long.valueOf(\"-9223372036854775808\")");
        assertThat(generator.expression(mapper.readTree("1.25"), "double")).isEqualTo("Double.valueOf(\"1.25\")");
        assertThat(generator.expression(mapper.readTree("true"), "boolean")).isEqualTo("Boolean.TRUE");
        assertThat(generator.expression(mapper.readTree("\"line\\nquote\\\"\""), "String")).isEqualTo("\"line\\nquote\\\"\"");
        assertThat(generator.expression(mapper.readTree("\"\\u00012\""), "String")).isEqualTo("\"\\001\" + \"2\"");
        assertThat(generator.expression(mapper.readTree("[1,2]"), "int[]")).isEqualTo("new int[]{Integer.valueOf(\"1\"), Integer.valueOf(\"2\")}");
        assertThat(generator.expression(mapper.readTree("[-1,2]"), "long[]")).isEqualTo("new long[]{Long.valueOf(\"-1\"), Long.valueOf(\"2\")}");
        assertThat(generator.expression(mapper.readTree("[\"a\",\"b\"]"), "String[]")).isEqualTo("new String[]{\"a\", \"b\"}");
        assertThat(generator.expression(mapper.readTree("[1,2]"), "List<Integer>")).contains("new java.util.ArrayList<Integer>");
        assertThat(generator.expression(mapper.readTree("[\"a\",\"b\"]"), "List<String>")).contains("new java.util.ArrayList<String>");
        assertThat(generator.expression(mapper.readTree("[]"), "List<Integer>")).isEqualTo("new java.util.ArrayList<Integer>()");
    }
}
