package com.leetcode.leetcodesystem.problem.judge;

import tools.jackson.databind.JsonNode;

final class JavaLiteralGenerator {

    String expression(JsonNode value, String type) {
        if (value == null || value.isNull()) {
            throw new IllegalArgumentException("Valores nulos não são suportados pelo schema 1.0.");
        }
        return switch (type) {
            case "int" -> integerExpression(value);
            case "long" -> longExpression(value);
            case "double" -> doubleExpression(value);
            case "boolean" -> booleanExpression(value);
            case "String" -> stringExpression(value);
            case "int[]" -> arrayExpression(value, "int", "int");
            case "long[]" -> arrayExpression(value, "long", "long");
            case "String[]" -> arrayExpression(value, "String", "String");
            case "List<Integer>" -> listExpression(value, "Integer", "int");
            case "List<String>" -> listExpression(value, "String", "String");
            default -> throw new IllegalArgumentException("Tipo não suportado: " + type);
        };
    }

    private String integerExpression(JsonNode value) {
        requireIntegral(value, "int");
        return "Integer.valueOf(\"" + value.toString() + "\")";
    }

    private String longExpression(JsonNode value) {
        requireIntegral(value, "long");
        return "Long.valueOf(\"" + value.toString() + "\")";
    }

    private String doubleExpression(JsonNode value) {
        if (!value.isNumber() || !Double.isFinite(value.doubleValue())) {
            throw new IllegalArgumentException("Valor incompatível com double.");
        }
        return "Double.valueOf(\"" + value.toString() + "\")";
    }

    private String booleanExpression(JsonNode value) {
        if (!value.isBoolean()) {
            throw new IllegalArgumentException("Valor incompatível com boolean.");
        }
        return value.booleanValue() ? "Boolean.TRUE" : "Boolean.FALSE";
    }

    private String stringExpression(JsonNode value) {
        if (!value.isTextual()) {
            throw new IllegalArgumentException("Valor incompatível com String.");
        }
        return quote(value.textValue());
    }

    private String arrayExpression(JsonNode value, String itemType, String itemValueType) {
        if (!value.isArray()) {
            throw new IllegalArgumentException("Valor incompatível com " + itemType + "[].");
        }
        StringBuilder expression = new StringBuilder("new ").append(itemType).append("[]{");
        for (int index = 0; index < value.size(); index++) {
            if (index > 0) {
                expression.append(", ");
            }
            expression.append(expression(value.get(index), itemValueType));
        }
        return expression.append('}').toString();
    }

    private String listExpression(JsonNode value, String itemType, String itemValueType) {
        if (!value.isArray()) {
            throw new IllegalArgumentException("Valor incompatível com List<" + itemType + ">.");
        }
        if (value.isEmpty()) {
            return "new java.util.ArrayList<" + itemType + ">()";
        }
        StringBuilder expression = new StringBuilder("new java.util.ArrayList<")
                .append(itemType)
                .append(">(java.util.Arrays.asList(");
        for (int index = 0; index < value.size(); index++) {
            if (index > 0) {
                expression.append(", ");
            }
            expression.append(expression(value.get(index), itemValueType));
        }
        return expression.append("))").toString();
    }

    private void requireIntegral(JsonNode value, String type) {
        boolean valid = value.isIntegralNumber()
                && ("int".equals(type) ? value.canConvertToInt() : value.canConvertToLong());
        if (!valid) {
            throw new IllegalArgumentException("Valor incompatível com " + type + ".");
        }
    }

    static String quote(String value) {
        StringBuilder result = new StringBuilder(value.length() + 2).append('"');
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            switch (character) {
                case '"' -> result.append("\\\"");
                case '\\' -> result.append("\\\\");
                case '\b' -> result.append("\\b");
                case '\f' -> result.append("\\f");
                case '\n' -> result.append("\\n");
                case '\r' -> result.append("\\r");
                case '\t' -> result.append("\\t");
                default -> {
                    if (Character.isISOControl(character)) {
                        String octal = Integer.toOctalString(character);
                        result.append('\\');
                        for (int padding = octal.length(); padding < 3; padding++) {
                            result.append('0');
                        }
                        result.append(octal);
                        result.append("\" + \"");
                    } else {
                        result.append(character);
                    }
                }
            }
        }
        return result.append('"').toString();
    }
}
