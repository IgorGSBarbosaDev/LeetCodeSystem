package com.leetcode.leetcodesystem.problem.importer;

import com.leetcode.leetcodesystem.problem.api.PackageValidationResponse;
import com.leetcode.leetcodesystem.problem.api.ProblemImportSummaryResponse;
import com.leetcode.leetcodesystem.problem.domain.Difficulty;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProblemPackageService {

    private final ProblemPackageParser parser;
    private final ProblemRepository problemRepository;
    private final ProblemPackagePersistenceService persistenceService;

    public ProblemPackageService(
            ProblemPackageParser parser,
            ProblemRepository problemRepository,
            ProblemPackagePersistenceService persistenceService
    ) {
        this.parser = parser;
        this.problemRepository = problemRepository;
        this.persistenceService = persistenceService;
    }

    public PackageValidationResponse validate(MultipartFile file) {
        ProblemPackageImportDto problemPackage = parser.parse(file);
        ensureNoExistingIds(problemPackage);
        return summarize(problemPackage);
    }

    public com.leetcode.leetcodesystem.problem.api.PackageImportResponse importPackage(MultipartFile file) {
        ProblemPackageImportDto problemPackage = parser.parse(file);
        ensureNoExistingIds(problemPackage);
        return persistenceService.persist(problemPackage);
    }

    private void ensureNoExistingIds(ProblemPackageImportDto problemPackage) {
        List<String> conflicts = new ArrayList<>();
        for (ProblemImportDto problem : problemPackage.problems()) {
            if (problemRepository.existsById(problem.id().trim())) {
                conflicts.add(problem.id().trim());
            }
        }
        if (!conflicts.isEmpty()) {
            throw new PackageConflictException(conflicts);
        }
    }

    private PackageValidationResponse summarize(ProblemPackageImportDto problemPackage) {
        List<ProblemImportSummaryResponse> summaries = problemPackage.problems().stream()
                .map(problem -> new ProblemImportSummaryResponse(
                        problem.id().trim(),
                        problem.title().trim(),
                        Difficulty.valueOf(problem.difficulty().trim()),
                        problem.categories().stream().map(String::trim).toList(),
                        (int) problem.testCases().stream().filter(testCase -> !testCase.hidden()).count(),
                        (int) problem.testCases().stream().filter(testCase -> testCase.hidden()).count()
                ))
                .toList();
        return new PackageValidationResponse(problemPackage.schemaVersion(), summaries.size(), summaries);
    }
}
