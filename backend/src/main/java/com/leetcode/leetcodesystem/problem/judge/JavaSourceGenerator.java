package com.leetcode.leetcodesystem.problem.judge;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

final class JavaSourceGenerator {

    private final JsonMapper mapper;
    private final JavaLiteralGenerator literals = new JavaLiteralGenerator();

    JavaSourceGenerator(JsonMapper mapper) {
        this.mapper = mapper;
    }

    GeneratedSources generate(JudgeProblemDefinition problem, String solutionCode) {
        StringBuilder runner = new StringBuilder();
        appendLine(runner, "import java.io.BufferedWriter;");
        appendLine(runner, "import java.io.IOException;");
        appendLine(runner, "import java.io.StringWriter;");
        appendLine(runner, "import java.nio.charset.StandardCharsets;");
        appendLine(runner, "import java.nio.file.Files;");
        appendLine(runner, "import java.nio.file.Path;");
        appendLine(runner, "import java.nio.file.StandardOpenOption;");
        appendLine(runner, "import java.util.Arrays;");
        appendLine(runner, "import java.util.Base64;");
        appendLine(runner, "import java.util.List;");
        appendLine(runner, "import java.util.Objects;");
        appendLine(runner, "");
        appendLine(runner, "public class TestRunner {");
        appendLine(runner, "    private static final Base64.Encoder ENCODER = Base64.getEncoder();");
        appendLine(runner, "");
        appendLine(runner, "    public static void main(String[] args) throws Exception {");
        appendLine(runner, "        if (args.length != 1) throw new IllegalArgumentException(\"result path is required\");");
        appendLine(runner, "        try (BufferedWriter out = Files.newBufferedWriter(Path.of(args[0]), StandardCharsets.UTF_8,");
        appendLine(runner, "                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {");
        appendLine(runner, "            Solution solution = new Solution();");

        for (JudgeTestCaseDefinition testCase : problem.testCases()) {
            appendTest(runner, problem, testCase);
        }

        appendLine(runner, "        }");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static void start(BufferedWriter out, int index) throws IOException {");
        appendLine(runner, "        out.write(\"START\\t\" + index + \"\\n\");");
        appendLine(runner, "        out.flush();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static void result(BufferedWriter out, int index, String status, long elapsedNanos, String actual, String error) throws IOException {");
        appendLine(runner, "        out.write(\"RESULT\\t\" + index + \"\\t\" + status + \"\\t\" + elapsedNanos + \"\\t\" + encode(actual) + \"\\t\" + encode(error) + \"\\n\");");
        appendLine(runner, "        out.flush();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String encode(String value) {");
        appendLine(runner, "        return ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static boolean equal(Object actual, Object expected, String type) {");
        appendLine(runner, "        if (actual == null || expected == null) return actual == expected;");
        appendLine(runner, "        return switch (type) {");
        appendLine(runner, "            case \"int[]\" -> Arrays.equals((int[]) actual, (int[]) expected);");
        appendLine(runner, "            case \"long[]\" -> Arrays.equals((long[]) actual, (long[]) expected);");
        appendLine(runner, "            case \"String[]\" -> Arrays.equals((String[]) actual, (String[]) expected);");
        appendLine(runner, "            case \"double\" -> Double.compare((Double) actual, (Double) expected) == 0;");
        appendLine(runner, "            case \"List<Integer>\", \"List<String>\" -> Objects.equals(actual, expected);");
        appendLine(runner, "            default -> Objects.equals(actual, expected);");
        appendLine(runner, "        };");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String json(Object value, String type) {");
        appendLine(runner, "        if (value == null) return \"null\";");
        appendLine(runner, "        return switch (type) {");
        appendLine(runner, "            case \"int\" -> Integer.toString((Integer) value);");
        appendLine(runner, "            case \"long\" -> Long.toString((Long) value);");
        appendLine(runner, "            case \"double\" -> Double.isFinite((Double) value) ? Double.toString((Double) value) : \"null\";");
        appendLine(runner, "            case \"boolean\" -> Boolean.toString((Boolean) value);");
        appendLine(runner, "            case \"String\" -> quote((String) value);");
        appendLine(runner, "            case \"int[]\" -> intArray((int[]) value);");
        appendLine(runner, "            case \"long[]\" -> longArray((long[]) value);");
        appendLine(runner, "            case \"String[]\" -> stringArray((String[]) value);");
        appendLine(runner, "            case \"List<Integer>\", \"List<String>\" -> listJson((List<?>) value);");
        appendLine(runner, "            default -> throw new IllegalArgumentException(\"Unsupported return type\");");
        appendLine(runner, "        };");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String intArray(int[] value) {");
        appendLine(runner, "        StringBuilder json = new StringBuilder(\"[\");");
        appendLine(runner, "        for (int i = 0; i < value.length; i++) { if (i > 0) json.append(','); json.append(value[i]); }");
        appendLine(runner, "        return json.append(']').toString();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String longArray(long[] value) {");
        appendLine(runner, "        StringBuilder json = new StringBuilder(\"[\");");
        appendLine(runner, "        for (int i = 0; i < value.length; i++) { if (i > 0) json.append(','); json.append(value[i]); }");
        appendLine(runner, "        return json.append(']').toString();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String stringArray(String[] value) {");
        appendLine(runner, "        StringBuilder json = new StringBuilder(\"[\");");
        appendLine(runner, "        for (int i = 0; i < value.length; i++) { if (i > 0) json.append(','); json.append(value[i] == null ? \"null\" : quote(value[i])); }");
        appendLine(runner, "        return json.append(']').toString();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String listJson(List<?> value) {");
        appendLine(runner, "        StringBuilder json = new StringBuilder(\"[\");");
        appendLine(runner, "        for (int i = 0; i < value.size(); i++) { if (i > 0) json.append(','); Object item = value.get(i); json.append(item instanceof String ? quote((String) item) : item); }");
        appendLine(runner, "        return json.append(']').toString();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String quote(String value) {");
        appendLine(runner, "        StringBuilder result = new StringBuilder(value.length() + 2).append((char) 34);");
        appendLine(runner, "        for (int i = 0; i < value.length(); i++) {");
        appendLine(runner, "            char c = value.charAt(i);");
        appendLine(runner, "            switch (c) {");
        appendLine(runner, "                case 34 -> result.append(\"\\\\\\\"\");");
        appendLine(runner, "                case 92 -> result.append(\"\\\\\\\\\");");
        appendLine(runner, "                case 8 -> result.append(\"\\\\b\");");
        appendLine(runner, "                case 12 -> result.append(\"\\\\f\");");
        appendLine(runner, "                case 10 -> result.append(\"\\\\n\");");
        appendLine(runner, "                case 13 -> result.append(\"\\\\r\");");
        appendLine(runner, "                case 9 -> result.append(\"\\\\t\");");
        appendLine(runner, "                default -> { if (Character.isISOControl(c)) { String hex = Integer.toHexString(c); result.append(\"\\\\u\"); for (int p = hex.length(); p < 4; p++) result.append('0'); result.append(hex); } else result.append(c); }");
        appendLine(runner, "            }");
        appendLine(runner, "        }");
        appendLine(runner, "        return result.append((char) 34).toString();");
        appendLine(runner, "    }");
        appendLine(runner, "");
        appendLine(runner, "    private static String stackTrace(Throwable throwable) {");
        appendLine(runner, "        StringWriter writer = new StringWriter();");
        appendLine(runner, "        throwable.printStackTrace(new java.io.PrintWriter(writer));");
        appendLine(runner, "        return writer.toString();");
        appendLine(runner, "    }");
        appendLine(runner, "}");

        return new GeneratedSources(solutionCode, runner.toString());
    }

    private void appendTest(StringBuilder runner, JudgeProblemDefinition problem, JudgeTestCaseDefinition testCase) {
        JsonNode input;
        JsonNode expected;
        try {
            input = mapper.readTree(testCase.inputJson());
            expected = mapper.readTree(testCase.expectedOutputJson());
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("Caso de teste contém JSON inválido.", exception);
        }

        appendLine(runner, "            start(out, " + testCase.index() + ");");
        appendLine(runner, "            long started" + testCase.index() + " = System.nanoTime();");
        appendLine(runner, "            try {");
        appendLine(runner, "                Object actual = solution." + problem.methodName() + "(" + arguments(problem, input) + ");");
        appendLine(runner, "                Object expected = " + literals.expression(expected, problem.returnType()) + ";");
        appendLine(runner, "                boolean passed = equal(actual, expected, " + JavaLiteralGenerator.quote(problem.returnType()) + ");");
        appendLine(runner, "                result(out, " + testCase.index() + ", passed ? \"ACCEPTED\" : \"WRONG_ANSWER\", System.nanoTime() - started" + testCase.index() + ", json(actual, " + JavaLiteralGenerator.quote(problem.returnType()) + "), \"\");");
        appendLine(runner, "            } catch (Throwable throwable) {");
        appendLine(runner, "                result(out, " + testCase.index() + ", \"RUNTIME_ERROR\", System.nanoTime() - started" + testCase.index() + ", \"\", stackTrace(throwable));");
        appendLine(runner, "                return;");
        appendLine(runner, "            }");
    }

    private String arguments(JudgeProblemDefinition problem, JsonNode input) {
        StringBuilder arguments = new StringBuilder();
        for (int index = 0; index < problem.parameters().size(); index++) {
            if (index > 0) {
                arguments.append(", ");
            }
            JudgeParameterDefinition parameter = problem.parameters().get(index);
            JsonNode value = input.get(parameter.name());
            if (value == null) {
                throw new IllegalArgumentException("Parâmetro ausente no caso de teste: " + parameter.name());
            }
            arguments.append(literals.expression(value, parameter.type()));
        }
        return arguments.toString();
    }

    private void appendLine(StringBuilder builder, String line) {
        builder.append(line).append('\n');
    }

    record GeneratedSources(String solution, String testRunner) {
    }
}
