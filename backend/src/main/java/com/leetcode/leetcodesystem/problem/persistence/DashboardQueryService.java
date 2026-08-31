package com.leetcode.leetcodesystem.problem.persistence;

import com.leetcode.leetcodesystem.problem.api.DashboardResponse;
import com.leetcode.leetcodesystem.problem.api.DashboardResponse.CategoryBreakdown;
import com.leetcode.leetcodesystem.problem.api.DashboardResponse.DifficultyBreakdown;
import com.leetcode.leetcodesystem.problem.api.DashboardResponse.Summary;
import com.leetcode.leetcodesystem.problem.api.SubmissionSummaryResponse;
import com.leetcode.leetcodesystem.problem.domain.CategoryEntity;
import com.leetcode.leetcodesystem.problem.domain.Difficulty;
import com.leetcode.leetcodesystem.problem.domain.ProblemEntity;
import com.leetcode.leetcodesystem.problem.domain.ProblemProgressEntity;
import com.leetcode.leetcodesystem.problem.domain.ProgressStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardQueryService {

    private static final int RECENT_SUBMISSIONS_LIMIT = 5;

    private final ProblemRepository problemRepository;
    private final SubmissionQueryService submissionQueryService;

    public DashboardQueryService(ProblemRepository problemRepository, SubmissionQueryService submissionQueryService) {
        this.problemRepository = problemRepository;
        this.submissionQueryService = submissionQueryService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        List<ProblemEntity> problems = problemRepository.findAllWithProgressAndCategories();
        int total = problems.size();
        int solved = (int) problems.stream().filter(this::isSolved).count();
        int attempted = (int) problems.stream().filter(this::isAttempted).count();
        int favorites = (int) problems.stream().filter(this::isFavorite).count();
        int reviews = (int) problems.stream().filter(this::isReviewRequired).count();

        Map<Difficulty, Counts> difficultyCounts = new EnumMap<>(Difficulty.class);
        for (Difficulty difficulty : Difficulty.values()) {
            difficultyCounts.put(difficulty, new Counts());
        }
        Map<String, Counts> categoryCounts = new HashMap<>();
        for (ProblemEntity problem : problems) {
            Counts difficulty = difficultyCounts.get(problem.getDifficulty());
            difficulty.total++;
            if (isSolved(problem)) {
                difficulty.solved++;
            }
            for (CategoryEntity category : problem.getCategories()) {
                Counts counts = categoryCounts.computeIfAbsent(category.getName(), ignored -> new Counts());
                counts.total++;
                if (isSolved(problem)) {
                    counts.solved++;
                }
            }
        }

        List<DifficultyBreakdown> byDifficulty = difficultyCounts.entrySet().stream()
                .map(entry -> new DifficultyBreakdown(
                        entry.getKey(), entry.getValue().total, entry.getValue().solved,
                        percentage(entry.getValue().solved, entry.getValue().total)
                ))
                .toList();
        List<CategoryBreakdown> byCategory = categoryCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new CategoryBreakdown(
                        entry.getKey(), entry.getValue().total, entry.getValue().solved,
                        percentage(entry.getValue().solved, entry.getValue().total)
                ))
                .toList();

        List<SubmissionSummaryResponse> recent = submissionQueryService.recent(RECENT_SUBMISSIONS_LIMIT);
        return new DashboardResponse(
                new Summary(
                        total,
                        solved,
                        total - solved,
                        attempted,
                        percentage(solved, total),
                        favorites,
                        reviews
                ),
                byDifficulty,
                byCategory,
                recent
        );
    }

    private boolean isSolved(ProblemEntity problem) {
        return progress(problem).getEffectiveStatus() == ProgressStatus.SOLVED;
    }

    private boolean isAttempted(ProblemEntity problem) {
        ProblemProgressEntity progress = progress(problem);
        return progress.getAttempts() > 0 && !isSolved(problem);
    }

    private boolean isFavorite(ProblemEntity problem) {
        return progress(problem).isFavorite();
    }

    private boolean isReviewRequired(ProblemEntity problem) {
        return progress(problem).isReviewRequired();
    }

    private ProblemProgressEntity progress(ProblemEntity problem) {
        if (problem.getProgress() != null) {
            return problem.getProgress();
        }
        return new ProblemProgressEntity(problem);
    }

    private int percentage(int numerator, int denominator) {
        return denominator == 0 ? 0 : (int) Math.round((numerator * 100.0) / denominator);
    }

    private static final class Counts {
        private int total;
        private int solved;
    }
}
