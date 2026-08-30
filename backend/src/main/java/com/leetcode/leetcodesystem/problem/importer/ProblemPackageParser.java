package com.leetcode.leetcodesystem.problem.importer;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class ProblemPackageParser {

    public static final long MAX_FILE_SIZE = 5L * 1024L * 1024L;

    private final JsonMapper mapper;
    private final ProblemPackageContentValidator contentValidator;

    public ProblemPackageParser(JsonMapper problemPackageJsonMapper, ProblemPackageContentValidator contentValidator) {
        this.mapper = problemPackageJsonMapper;
        this.contentValidator = contentValidator;
    }

    public ProblemPackageImportDto parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new PackageValidationException(List.of(
                    new ValidationErrorDetail("$", "O arquivo não pode estar vazio.")
            ));
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new PackageFileTooLargeException();
        }

        final byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new PackageValidationException(List.of(
                    new ValidationErrorDetail("$", "Não foi possível ler o arquivo enviado.")
            ));
        }
        if (content.length == 0) {
            throw new PackageValidationException(List.of(
                    new ValidationErrorDetail("$", "O arquivo não pode estar vazio.")
            ));
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content));
        } catch (CharacterCodingException exception) {
            throw new PackageValidationException(List.of(
                    new ValidationErrorDetail("$", "O arquivo deve ser codificado em UTF-8.")
            ));
        }

        final ProblemPackageImportDto problemPackage;
        try {
            problemPackage = mapper.readValue(content, ProblemPackageImportDto.class);
        } catch (JacksonException exception) {
            throw new PackageValidationException(List.of(
                    new ValidationErrorDetail("$", "O arquivo não contém um pacote JSON válido: " + safeMessage(exception))
            ));
        }

        List<ValidationErrorDetail> errors = new ArrayList<>(contentValidator.validate(problemPackage));
        if (!errors.isEmpty()) {
            throw new PackageValidationException(errors);
        }
        return problemPackage;
    }

    private String safeMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return "erro de sintaxe";
        }
        int newline = message.indexOf('\n');
        return (newline >= 0 ? message.substring(0, newline) : message).trim();
    }
}
