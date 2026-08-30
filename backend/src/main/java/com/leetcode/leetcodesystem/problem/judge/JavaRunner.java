package com.leetcode.leetcodesystem.problem.judge;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@Service
public class JavaRunner {

    private static final Set<String> JAVA_KEYWORDS = Set.of(
            "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class",
            "const", "continue", "default", "do", "double", "else", "enum", "extends", "final",
            "finally", "float", "for", "goto", "if", "implements", "import", "instanceof", "int",
            "interface", "long", "native", "new", "package", "private", "protected", "public",
            "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this",
            "throw", "throws", "transient", "try", "void", "volatile", "while", "true", "false",
            "null", "_"
    );

    private static final String SOLUTION_FILE = "Solution.java";
    private static final String TEST_RUNNER_FILE = "TestRunner.java";
    private static final String RESULT_FILE = "results.log";

    private final JavaRunnerProperties properties;
    private final JavaSourceGenerator sourceGenerator;

    public JavaRunner(JavaRunnerProperties properties, JsonMapper problemPackageJsonMapper) {
        this.properties = properties;
        this.sourceGenerator = new JavaSourceGenerator(problemPackageJsonMapper);
    }

    public JudgeExecutionResult execute(JudgeProblemDefinition problem, String solutionCode) {
        validateProblem(problem);
        if (solutionCode == null || solutionCode.isBlank()) {
            throw new IllegalArgumentException("O código da solução não pode ser vazio.");
        }

        long started = System.nanoTime();
        Path temporaryDirectory = null;
        try {
            temporaryDirectory = Files.createTempDirectory("leetcodesystem-judge-");
            JavaSourceGenerator.GeneratedSources sources = sourceGenerator.generate(problem, solutionCode);
            Files.writeString(
                    temporaryDirectory.resolve(SOLUTION_FILE),
                    sources.solution(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE_NEW
            );
            Files.writeString(
                    temporaryDirectory.resolve(TEST_RUNNER_FILE),
                    sources.testRunner(),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE_NEW
            );

            ProcessResult compilation = runProcess(
                    List.of(
                            properties.getJavacCommand(),
                            "--release", "21",
                            "-encoding", "UTF-8",
                            SOLUTION_FILE,
                            TEST_RUNNER_FILE
                    ),
                    temporaryDirectory,
                    properties.getCompilationTimeout()
            );
            if (compilation.timedOut() || compilation.exitCode() != 0) {
                String diagnostic = firstNonBlank(compilation.stderr(), compilation.stdout());
                if (compilation.timedOut()) {
                    diagnostic = "A compilação excedeu o limite de "
                            + properties.getCompilationTimeout().toSeconds() + " segundos.";
                }
                return new JudgeExecutionResult(
                        JudgeStatus.COMPILATION_ERROR,
                        0,
                        problem.testCases().size(),
                        elapsedMillis(started),
                        List.of(),
                        diagnostic,
                        null
                );
            }

            Path resultPath = temporaryDirectory.resolve(RESULT_FILE);
            ProcessResult execution = runProcess(
                    List.of(
                            properties.getJavaCommand(),
                            "-Dfile.encoding=UTF-8",
                            "-cp",
                            temporaryDirectory.toString(),
                            "TestRunner",
                            resultPath.toString()
                    ),
                    temporaryDirectory,
                    properties.getExecutionTimeout()
            );
            return buildExecutionResult(problem, resultPath, execution, elapsedMillis(started));
        } catch (IOException exception) {
            throw new RunnerUnavailableException("Não foi possível preparar ou executar o Java Runner.", exception);
        } finally {
            deleteTemporaryDirectory(temporaryDirectory);
        }
    }

    private JudgeExecutionResult buildExecutionResult(
            JudgeProblemDefinition problem,
            Path resultPath,
            ProcessResult process,
            long elapsedMillis
    ) {
        ProtocolResults protocol;
        try {
            protocol = readResults(resultPath, problem.testCases().size(), process.timedOut());
        } catch (IOException | IllegalArgumentException exception) {
            return new JudgeExecutionResult(
                    JudgeStatus.RUNTIME_ERROR,
                    0,
                    problem.testCases().size(),
                    elapsedMillis,
                    List.of(),
                    null,
                    "O TestRunner não produziu um protocolo de resultados válido."
            );
        }
        List<RawTestResult> rawResults = protocol.results();

        Map<Integer, JudgeTestCaseDefinition> testCases = new HashMap<>();
        for (JudgeTestCaseDefinition testCase : problem.testCases()) {
            testCases.put(testCase.index(), testCase);
        }

        List<JudgeTestResult> results = new ArrayList<>();
        int testsPassed = 0;
        RawTestResult runtimeFailure = null;
        for (RawTestResult raw : rawResults) {
            JudgeTestCaseDefinition testCase = testCases.get(raw.index());
            if (testCase == null) {
                return protocolError(problem, elapsedMillis);
            }
            if (raw.status() == JudgeStatus.ACCEPTED) {
                testsPassed++;
            }
            if (raw.status() == JudgeStatus.RUNTIME_ERROR) {
                runtimeFailure = raw;
            }
            results.add(toTestResult(testCase, raw));
        }

        if (process.timedOut()) {
            if (protocol.startedIndex() != null) {
                JudgeTestCaseDefinition timedOutTest = testCases.get(protocol.startedIndex());
                if (timedOutTest != null) {
                    results.add(new JudgeTestResult(
                            timedOutTest.index(),
                            timedOutTest.hidden(),
                            JudgeStatus.TIME_LIMIT_EXCEEDED,
                            timedOutTest.hidden() ? null : timedOutTest.inputJson(),
                            timedOutTest.hidden() ? null : timedOutTest.expectedOutputJson(),
                            null,
                            properties.getExecutionTimeout().toMillis(),
                            null
                    ));
                }
            }
            return new JudgeExecutionResult(
                    JudgeStatus.TIME_LIMIT_EXCEEDED,
                    testsPassed,
                    problem.testCases().size(),
                    elapsedMillis,
                    results,
                    null,
                    null
            );
        }

        if (process.exitCode() != 0 || rawResults.size() != problem.testCases().size()) {
            String error = runtimeFailure == null
                    ? "O processo de execução terminou sem concluir o protocolo de testes."
                    : runtimeFailure.error();
            return new JudgeExecutionResult(
                    JudgeStatus.RUNTIME_ERROR,
                    testsPassed,
                    problem.testCases().size(),
                    elapsedMillis,
                    results,
                    null,
                    visibleRuntimeError(runtimeFailure, testCases, error)
            );
        }

        JudgeStatus status = runtimeFailure != null
                ? JudgeStatus.RUNTIME_ERROR
                : testsPassed == problem.testCases().size() ? JudgeStatus.ACCEPTED : JudgeStatus.WRONG_ANSWER;
        return new JudgeExecutionResult(
                status,
                testsPassed,
                problem.testCases().size(),
                elapsedMillis,
                results,
                null,
                visibleRuntimeError(runtimeFailure, testCases, null)
        );
    }

    private JudgeExecutionResult protocolError(JudgeProblemDefinition problem, long elapsedMillis) {
        return new JudgeExecutionResult(
                JudgeStatus.RUNTIME_ERROR,
                0,
                problem.testCases().size(),
                elapsedMillis,
                List.of(),
                null,
                "O TestRunner produziu um resultado de teste desconhecido."
        );
    }

    private String visibleRuntimeError(
            RawTestResult runtimeFailure,
            Map<Integer, JudgeTestCaseDefinition> testCases,
            String fallback
    ) {
        if (runtimeFailure == null) {
            return fallback;
        }
        JudgeTestCaseDefinition testCase = testCases.get(runtimeFailure.index());
        if (testCase != null && testCase.hidden()) {
            return "Ocorreu um erro de execução em um teste oculto.";
        }
        return firstNonBlank(runtimeFailure.error(), fallback);
    }

    private JudgeTestResult toTestResult(JudgeTestCaseDefinition testCase, RawTestResult raw) {
        if (testCase.hidden()) {
            return new JudgeTestResult(
                    raw.index(),
                    true,
                    raw.status(),
                    null,
                    null,
                    null,
                    raw.executionTimeMs(),
                    null
            );
        }
        return new JudgeTestResult(
                raw.index(),
                false,
                raw.status(),
                testCase.inputJson(),
                testCase.expectedOutputJson(),
                raw.actualJson().isBlank() ? null : raw.actualJson(),
                raw.executionTimeMs(),
                raw.error().isBlank() ? null : raw.error()
        );
    }

    private ProtocolResults readResults(Path resultPath, int expectedCount, boolean allowIncompleteStart) throws IOException {
        if (!Files.exists(resultPath)) {
            return new ProtocolResults(List.of(), null);
        }
        List<RawTestResult> results = new ArrayList<>();
        Set<Integer> completed = new HashSet<>();
        Integer started = null;
        Base64.Decoder decoder = Base64.getDecoder();
        for (String line : Files.readAllLines(resultPath, StandardCharsets.UTF_8)) {
            String[] fields = line.split("\\t", -1);
            if (fields.length == 2 && "START".equals(fields[0])) {
                int index = parseIndex(fields[1]);
                if (started != null || index != results.size() || index < 0 || index >= expectedCount) {
                    throw new IllegalArgumentException("Evento START inválido.");
                }
                started = index;
            } else if (fields.length == 6 && "RESULT".equals(fields[0])) {
                int index = parseIndex(fields[1]);
                if (started == null || started != index || !completed.add(index)) {
                    throw new IllegalArgumentException("Evento RESULT inválido.");
                }
                JudgeStatus status = JudgeStatus.valueOf(fields[2]);
                long elapsedNanos = Long.parseLong(fields[3]);
                String actual = new String(decoder.decode(fields[4]), StandardCharsets.UTF_8);
                String error = new String(decoder.decode(fields[5]), StandardCharsets.UTF_8);
                results.add(new RawTestResult(index, status, nanosToMillis(elapsedNanos), actual, error));
                started = null;
            } else {
                throw new IllegalArgumentException("Linha de protocolo inválida.");
            }
        }
        if (started != null && !allowIncompleteStart) {
            throw new IllegalArgumentException("O último teste não foi concluído.");
        }
        return new ProtocolResults(results, started);
    }

    private int parseIndex(String value) {
        int index = Integer.parseInt(value);
        if (index < 0) {
            throw new IllegalArgumentException("Índice inválido.");
        }
        return index;
    }

    private void validateProblem(JudgeProblemDefinition problem) {
        if (problem == null || problem.methodName() == null || problem.returnType() == null) {
            throw new IllegalArgumentException("Definição de problema inválida.");
        }
        if (!validJavaIdentifier(problem.methodName())) {
            throw new IllegalArgumentException("Nome de método inválido.");
        }
        if (!Set.of(
                "int", "long", "double", "boolean", "String",
                "int[]", "long[]", "String[]", "List<Integer>", "List<String>"
        ).contains(problem.returnType())) {
            throw new IllegalArgumentException("Tipo de retorno não suportado.");
        }
        if (problem.parameters() == null || problem.testCases() == null) {
            throw new IllegalArgumentException("Parâmetros e casos de teste são obrigatórios.");
        }
        Set<String> names = new HashSet<>();
        for (JudgeParameterDefinition parameter : problem.parameters()) {
            if (parameter == null
                    || parameter.name() == null
                    || !validJavaIdentifier(parameter.name())
                    || !names.add(parameter.name())
                    || !supportedType(parameter.type())) {
                throw new IllegalArgumentException("Parâmetro inválido.");
            }
        }
        for (int index = 0; index < problem.testCases().size(); index++) {
            JudgeTestCaseDefinition testCase = problem.testCases().get(index);
            if (testCase == null || testCase.index() != index || testCase.inputJson() == null || testCase.expectedOutputJson() == null) {
                throw new IllegalArgumentException("Caso de teste inválido.");
            }
        }
    }

    private boolean supportedType(String type) {
        return Set.of(
                "int", "long", "double", "boolean", "String",
                "int[]", "long[]", "String[]", "List<Integer>", "List<String>"
        ).contains(type);
    }

    private boolean validJavaIdentifier(String value) {
        return value != null
                && value.matches("[A-Za-z_$][A-Za-z0-9_$]*")
                && !JAVA_KEYWORDS.contains(value);
    }

    private ProcessResult runProcess(List<String> command, Path directory, Duration timeout) {
        Process process;
        try {
            process = new ProcessBuilder(command)
                    .directory(directory.toFile())
                    .redirectInput(ProcessBuilder.Redirect.PIPE)
                    .start();
        } catch (IOException exception) {
            throw new RunnerUnavailableException("Não foi possível iniciar o comando Java do executor.", exception);
        }

        ExecutorService streams = Executors.newVirtualThreadPerTaskExecutor();
        Future<String> stdout = streams.submit(() -> readBounded(process.getInputStream()));
        Future<String> stderr = streams.submit(() -> readBounded(process.getErrorStream()));
        boolean timedOut = false;
        try {
            timedOut = !process.waitFor(timeoutMillis(timeout), TimeUnit.MILLISECONDS);
            if (timedOut) {
                terminateProcessTree(process);
            }
            int exitCode = process.isAlive() ? -1 : process.exitValue();
            return new ProcessResult(exitCode, timedOut, getStream(stdout), getStream(stderr));
        } catch (InterruptedException exception) {
            terminateProcessTree(process);
            Thread.currentThread().interrupt();
            throw new RunnerUnavailableException("A execução do Java Runner foi interrompida.", exception);
        } finally {
            streams.shutdownNow();
        }
    }

    private String getStream(Future<String> stream) {
        try {
            return stream.get(2, TimeUnit.SECONDS);
        } catch (Exception exception) {
            return "";
        }
    }

    private String readBounded(InputStream stream) throws IOException {
        int maximum = Math.max(1, properties.getMaxOutputBytes());
        ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(maximum, 8192));
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = stream.read(buffer)) != -1) {
            if (total < maximum) {
                int retained = Math.min(read, maximum - total);
                output.write(buffer, 0, retained);
                total += retained;
            }
        }
        String value = output.toString(StandardCharsets.UTF_8);
        return total >= maximum ? value + "\n[saída truncada]" : value;
    }

    private void terminateProcessTree(Process process) {
        process.toHandle().descendants().toList().reversed().forEach(handle -> {
            handle.destroy();
            handle.destroyForcibly();
        });
        process.destroy();
        process.destroyForcibly();
        try {
            process.waitFor(2, TimeUnit.SECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }

    private void deleteTemporaryDirectory(Path directory) {
        if (directory == null) {
            return;
        }
        for (int attempt = 0; attempt < 3 && Files.exists(directory); attempt++) {
            try (var paths = Files.walk(directory)) {
                paths.sorted((left, right) -> right.compareTo(left))
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                            } catch (IOException ignored) {
                                path.toFile().deleteOnExit();
                            }
                        });
            } catch (IOException ignored) {
                directory.toFile().deleteOnExit();
            }
            if (Files.exists(directory) && attempt < 2) {
                Thread.yield();
            }
        }
    }

    private long timeoutMillis(Duration timeout) {
        return Math.max(1, timeout.toMillis());
    }

    private long elapsedMillis(long started) {
        return nanosToMillis(System.nanoTime() - started);
    }

    private long nanosToMillis(long nanos) {
        return Math.max(0, (nanos + 999_999L) / 1_000_000L);
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second == null ? "" : second;
    }

    private record ProcessResult(int exitCode, boolean timedOut, String stdout, String stderr) {
    }

    private record RawTestResult(
            int index,
            JudgeStatus status,
            long executionTimeMs,
            String actualJson,
            String error
    ) {
    }

    private record ProtocolResults(List<RawTestResult> results, Integer startedIndex) {
    }
}
