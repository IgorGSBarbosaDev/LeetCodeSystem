package com.leetcode.leetcodesystem.problem.importer;

import com.leetcode.leetcodesystem.problem.api.PackageImportResponse;
import com.leetcode.leetcodesystem.problem.domain.Difficulty;
import com.leetcode.leetcodesystem.problem.domain.MethodParameterEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemConstraintEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemExampleEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import com.leetcode.leetcodesystem.problem.domain.TestCaseEntity;
import com.leetcode.leetcodesystem.problem.persistence.CategoryRepository;
import com.leetcode.leetcodesystem.problem.persistence.ProblemRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProblemPackagePersistenceService {

    private final ProblemRepository problemRepository;
    private final CategoryRepository categoryRepository;
    private final JsonMapper mapper;

    @PersistenceContext
    private EntityManager entityManager;

    public ProblemPackagePersistenceService(
            ProblemRepository problemRepository,
            CategoryRepository categoryRepository,
            JsonMapper problemPackageJsonMapper
    ) {
        this.problemRepository = problemRepository;
        this.categoryRepository = categoryRepository;
        this.mapper = problemPackageJsonMapper;
    }

    @Transactional
    public PackageImportResponse persist(ProblemPackageImportDto problemPackage) {
        List<String> conflicts = problemPackage.problems().stream()
                .map(problem -> problem.id().trim())
                .filter(problemRepository::existsById)
                .toList();
        if (!conflicts.isEmpty()) {
            throw new PackageConflictException(conflicts);
        }

        List<ProblemEntity> entities = new ArrayList<>();
        for (ProblemImportDto problem : problemPackage.problems()) {
            ProblemEntity entity = toEntity(problem);
            entityManager.persist(entity);
            ProblemProgressEntity progress = new ProblemProgressEntity(entity);
            entityManager.persist(progress);
            entity.setProgress(progress);
            entities.add(entity);
        }
        entityManager.flush();
        return new PackageImportResponse(
                entities.size(),
                entities.stream().map(ProblemEntity::getId).toList()
        );
    }

    private ProblemEntity toEntity(ProblemImportDto source) {
        ProblemEntity problem = new ProblemEntity(
                source.id().trim(),
                source.title().trim(),
                Difficulty.valueOf(source.difficulty().trim()),
                source.description(),
                source.method().name().trim(),
                source.method().returnType().trim(),
                source.starterCode().java(),
                source.solution().java(),
                source.solution().explanation(),
                source.solution().timeComplexity().trim(),
                source.solution().spaceComplexity().trim()
        );

        source.categories().forEach(categoryName ->
                categoryRepository.findByName(categoryName.trim()).ifPresentOrElse(
                        problem::addCategory,
                        () -> {
                            throw new IllegalStateException("Categoria não cadastrada: " + categoryName);
                        }
                )
        );

        for (int index = 0; index < source.constraints().size(); index++) {
            problem.addConstraint(new ProblemConstraintEntity(problem, index, source.constraints().get(index)));
        }
        for (int index = 0; index < source.examples().size(); index++) {
            var example = source.examples().get(index);
            problem.addExample(new ProblemExampleEntity(problem, index, example.input(), example.output(), example.explanation()));
        }
        for (int index = 0; index < source.method().parameters().size(); index++) {
            var parameter = source.method().parameters().get(index);
            problem.addParameter(new MethodParameterEntity(problem, index, parameter.name().trim(), parameter.type().trim()));
        }
        for (int index = 0; index < source.testCases().size(); index++) {
            var testCase = source.testCases().get(index);
            problem.addTestCase(new TestCaseEntity(
                    problem,
                    index,
                    writeJson(testCase.input()),
                    writeJson(testCase.expectedOutput()),
                    testCase.hidden()
            ));
        }
        return problem;
    }

    private String writeJson(tools.jackson.databind.JsonNode value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalStateException("Não foi possível normalizar o JSON do caso de teste.", exception);
        }
    }
}
