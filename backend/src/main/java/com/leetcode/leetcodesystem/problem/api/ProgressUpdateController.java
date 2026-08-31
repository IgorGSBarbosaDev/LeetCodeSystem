package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.persistence.ProblemProgressService;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/problems")
public class ProgressUpdateController {

    private static final Set<String> ALLOWED_FIELDS = Set.of("favorite", "reviewRequired");

    private final ProblemProgressService progressService;

    public ProgressUpdateController(ProblemProgressService progressService) {
        this.progressService = progressService;
    }

    @PatchMapping("/{id}/progress")
    public ProblemProgressResponse update(
            @PathVariable String id,
            @RequestBody(required = false) JsonNode body
    ) {
        if (body == null || !body.isObject()) {
            throw invalid("Envie um objeto com favorite e/ou reviewRequired.");
        }

        Set<String> fields = new HashSet<>();
        for (String name : body.propertyNames()) {
            fields.add(name);
            if (!ALLOWED_FIELDS.contains(name)) {
                throw invalid("Campo não suportado: " + name + ".");
            }
        }
        if (fields.isEmpty()) {
            throw invalid("Informe favorite e/ou reviewRequired.");
        }

        JsonNode favoriteNode = body.get("favorite");
        JsonNode reviewNode = body.get("reviewRequired");
        if (favoriteNode != null && !favoriteNode.isBoolean()) {
            throw invalid("favorite deve ser booleano.");
        }
        if (reviewNode != null && !reviewNode.isBoolean()) {
            throw invalid("reviewRequired deve ser booleano.");
        }

        return progressService.update(
                id,
                favoriteNode == null ? null : favoriteNode.booleanValue(),
                reviewNode == null ? null : reviewNode.booleanValue()
        );
    }

    private InvalidProgressUpdateException invalid(String message) {
        return new InvalidProgressUpdateException(message);
    }
}
