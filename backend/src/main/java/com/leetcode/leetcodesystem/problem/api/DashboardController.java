package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.persistence.DashboardQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardQueryService dashboardQueryService;

    public DashboardController(DashboardQueryService dashboardQueryService) {
        this.dashboardQueryService = dashboardQueryService;
    }

    @GetMapping
    public DashboardResponse getDashboard() {
        return dashboardQueryService.getDashboard();
    }
}
