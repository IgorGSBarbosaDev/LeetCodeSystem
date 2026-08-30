package com.leetcode.leetcodesystem.problem.importer;

import com.leetcode.leetcodesystem.problem.domain.Difficulty;
import com.leetcode.leetcodesystem.problem.domain.ProblemCategory;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class ProblemPackageContentValidator {

    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "int",
            "long",
            "double",
            "boolean",
            "String",
            "int[]",
            "long[]",
            "String[]",
            "List<Integer>",
            "List<String>"
    );

    private static final Pattern JAVA_IDENTIFIER = Pattern.compile("[A-Za-z_$][A-Za-z0-9_$]*");

    private final Validator beanValidator;

    public ProblemPackageContentValidator(Validator beanValidator) {
        this.beanValidator = beanValidator;
    }

    public List<ValidationErrorDetail> validate(ProblemPackageImportDto problemPackage) {
        List<ValidationErrorDetail> errors = new ArrayList<>();
        if (problemPackage == null) {
            errors.add(new ValidationErrorDetail("$", "O conteúdo do arquivo não pode ser nulo."));
            return errors;
        }

        for (ConstraintViolation<ProblemPackageImportDto> violation : beanValidator.validate(problemPackage)) {
            errors.add(new ValidationErrorDetail(normalizePath(violation.getPropertyPath().toString()), violation.getMessage()));
        }

        if (problemPackage.problems() == null) {
            return errors;
        }

        Set<String> packageIds = new HashSet<>();
        for (int index = 0; index < problemPackage.problems().size(); index++) {
            ProblemImportDto problem = problemPackage.problems().get(index);
            String path = "problems[" + index + "]";
            if (problem == null) {
                continue;
            }

            if (problem.id() != null && !packageIds.add(problem.id().trim())) {
                errors.add(new ValidationErrorDetail(path + ".id", "O ID deve ser único dentro do pacote."));
            }

            validateDifficulty(problem, path, errors);
            validateCategories(problem, path, errors);
            validateMethod(problem, path, errors);
            validateStarterCode(problem, path, errors);
            validateTestCases(problem, path, errors);
        }
        errors.sort(Comparator.comparing(ValidationErrorDetail::path).thenComparing(ValidationErrorDetail::message));
        return errors;
    }

    private void validateDifficulty(ProblemImportDto problem, String path, List<ValidationErrorDetail> errors) {
        if (problem.difficulty() == null || problem.difficulty().isBlank()) {
            return;
        }
        try {
            Difficulty.valueOf(problem.difficulty().trim());
        } catch (IllegalArgumentException exception) {
            errors.add(new ValidationErrorDetail(path + ".difficulty", "difficulty deve ser EASY, MEDIUM ou HARD."));
        }
    }

    private void validateCategories(ProblemImportDto problem, String path, List<ValidationErrorDetail> errors) {
        if (problem.categories() == null) {
            return;
        }
        Set<String> categories = new HashSet<>();
        for (int index = 0; index < problem.categories().size(); index++) {
            String category = problem.categories().get(index);
            if (category == null || category.isBlank()) {
                continue;
            }
            String normalized = category.trim();
            if (!ProblemCategory.ALLOWED.contains(normalized)) {
                errors.add(new ValidationErrorDetail(path + ".categories[" + index + "]", "Categoria não suportada: " + normalized + "."));
            }
            if (!categories.add(normalized)) {
                errors.add(new ValidationErrorDetail(path + ".categories[" + index + "]", "A categoria não pode se repetir."));
            }
        }
    }

    private void validateMethod(ProblemImportDto problem, String path, List<ValidationErrorDetail> errors) {
        MethodImportDto method = problem.method();
        if (method == null) {
            return;
        }
        validateJavaIdentifier(method.name(), path + ".method.name", errors);
        validateType(method.returnType(), path + ".method.returnType", errors);

        if (method.parameters() == null) {
            return;
        }
        Set<String> names = new HashSet<>();
        for (int index = 0; index < method.parameters().size(); index++) {
            MethodParameterImportDto parameter = method.parameters().get(index);
            if (parameter == null) {
                continue;
            }
            String parameterPath = path + ".method.parameters[" + index + "]";
            validateJavaIdentifier(parameter.name(), parameterPath + ".name", errors);
            validateType(parameter.type(), parameterPath + ".type", errors);
            if (parameter.name() != null && !parameter.name().isBlank() && !names.add(parameter.name().trim())) {
                errors.add(new ValidationErrorDetail(parameterPath + ".name", "O nome do parâmetro não pode se repetir."));
            }
        }
    }

    private void validateStarterCode(ProblemImportDto problem, String path, List<ValidationErrorDetail> errors) {
        if (problem.starterCode() == null || problem.starterCode().java() == null) {
            return;
        }
        String code = problem.starterCode().java();
        if (!code.matches("(?s).*\\bclass\\s+Solution\\b.*")) {
            errors.add(new ValidationErrorDetail(path + ".starterCode.java", "O código inicial deve declarar class Solution."));
        }
        if (problem.method() != null && problem.method().name() != null && !code.contains(problem.method().name().trim())) {
            errors.add(new ValidationErrorDetail(path + ".starterCode.java", "O código inicial deve mencionar o método informado."));
        }
    }

    private void validateTestCases(ProblemImportDto problem, String path, List<ValidationErrorDetail> errors) {
        if (problem.testCases() == null || problem.method() == null || problem.method().parameters() == null) {
            return;
        }

        boolean hasPublic = false;
        boolean hasHidden = false;
        for (int index = 0; index < problem.testCases().size(); index++) {
            TestCaseImportDto testCase = problem.testCases().get(index);
            if (testCase == null) {
                continue;
            }
            String testPath = path + ".testCases[" + index + "]";
            if (Boolean.TRUE.equals(testCase.hidden())) {
                hasHidden = true;
            } else if (Boolean.FALSE.equals(testCase.hidden())) {
                hasPublic = true;
            }

            validateInput(testCase.input(), problem.method().parameters(), testPath + ".input", errors);
            if (testCase.expectedOutput() != null && problem.method().returnType() != null) {
                String returnType = problem.method().returnType().trim();
                if (!isCompatible(testCase.expectedOutput(), returnType)) {
                    errors.add(new ValidationErrorDetail(testPath + ".expectedOutput", "O valor deve ser compatível com " + returnType + "."));
                }
            }
        }

        if (!hasPublic) {
            errors.add(new ValidationErrorDetail(path + ".testCases", "É necessário informar pelo menos um caso público."));
        }
        if (!hasHidden) {
            errors.add(new ValidationErrorDetail(path + ".testCases", "É necessário informar pelo menos um caso oculto."));
        }
    }

    private void validateInput(
            JsonNode input,
            List<MethodParameterImportDto> parameters,
            String path,
            List<ValidationErrorDetail> errors
    ) {
        if (input == null || !input.isObject()) {
            errors.add(new ValidationErrorDetail(path, "input deve ser um objeto indexado pelos nomes dos parâmetros."));
            return;
        }

        Set<String> parameterNames = new HashSet<>();
        for (int index = 0; index < parameters.size(); index++) {
            MethodParameterImportDto parameter = parameters.get(index);
            if (parameter == null || parameter.name() == null || parameter.type() == null) {
                continue;
            }
            String name = parameter.name().trim();
            parameterNames.add(name);
            JsonNode value = input.get(name);
            if (value == null) {
                errors.add(new ValidationErrorDetail(path + "." + name, "O parâmetro é obrigatório."));
            } else if (!isCompatible(value, parameter.type().trim())) {
                errors.add(new ValidationErrorDetail(path + "." + name, "O valor deve ser compatível com " + parameter.type().trim() + "."));
            }
        }
        for (String propertyName : input.propertyNames()) {
            if (!parameterNames.contains(propertyName)) {
                errors.add(new ValidationErrorDetail(path + "." + propertyName, "Parâmetro não declarado no método."));
            }
        }
    }

    private void validateJavaIdentifier(String value, String path, List<ValidationErrorDetail> errors) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = value.trim();
        if (!JAVA_IDENTIFIER.matcher(normalized).matches() || isJavaKeyword(normalized)) {
            errors.add(new ValidationErrorDetail(path, "Deve ser um identificador Java válido."));
        }
    }

    private void validateType(String value, String path, List<ValidationErrorDetail> errors) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = value.trim();
        if (!SUPPORTED_TYPES.contains(normalized)) {
            errors.add(new ValidationErrorDetail(path, "Tipo não suportado: " + normalized + "."));
        }
    }

    private boolean isCompatible(JsonNode value, String type) {
        if (value == null || value.isNull()) {
            return false;
        }
        return switch (type) {
            case "int" -> value.isIntegralNumber() && value.canConvertToInt();
            case "long" -> value.isIntegralNumber() && value.canConvertToLong();
            case "double" -> value.isNumber() && Double.isFinite(value.doubleValue());
            case "boolean" -> value.isBoolean();
            case "String" -> value.isTextual();
            case "int[]", "List<Integer>" -> isArrayOf(value, "int");
            case "long[]" -> isArrayOf(value, "long");
            case "String[]", "List<String>" -> isArrayOf(value, "String");
            default -> false;
        };
    }

    private boolean isArrayOf(JsonNode value, String itemType) {
        if (!value.isArray()) {
            return false;
        }
        for (JsonNode item : value) {
            if (!isCompatible(item, itemType)) {
                return false;
            }
        }
        return true;
    }

    private boolean isJavaKeyword(String value) {
        return Set.of(
                "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
                "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
                "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
                "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
                "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile",
                "while", "true", "false", "null", "_"
        ).contains(value);
    }

    private String normalizePath(String path) {
        return path.replace(".<list element>", "").replace(".<iterable element>", "");
    }
}
