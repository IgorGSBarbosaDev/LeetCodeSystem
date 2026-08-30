package com.leetcode.leetcodesystem.problem.importer;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class ProblemPackageJsonConfiguration {

    @Bean
    public JsonMapper problemPackageJsonMapper() {
        return JsonMapper.builder()
                .enable(
                        DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                        DeserializationFeature.FAIL_ON_TRAILING_TOKENS
                )
                .build();
    }
}
