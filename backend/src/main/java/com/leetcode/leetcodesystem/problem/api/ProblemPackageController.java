package com.leetcode.leetcodesystem.problem.api;

import com.leetcode.leetcodesystem.problem.importer.ProblemPackageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/problem-packages")
public class ProblemPackageController {

    private final ProblemPackageService problemPackageService;

    public ProblemPackageController(ProblemPackageService problemPackageService) {
        this.problemPackageService = problemPackageService;
    }

    @PostMapping(path = "/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PackageValidationResponse validate(@RequestPart("file") MultipartFile file) {
        return problemPackageService.validate(file);
    }

    @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PackageImportResponse> importPackage(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(problemPackageService.importPackage(file));
    }
}
