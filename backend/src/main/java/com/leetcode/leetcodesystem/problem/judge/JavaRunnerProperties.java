package com.leetcode.leetcodesystem.problem.judge;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "judge")
public class JavaRunnerProperties {

    private String javaCommand = "java";
    private String javacCommand = "javac";
    private Duration executionTimeout = Duration.ofSeconds(3);
    private Duration compilationTimeout = Duration.ofSeconds(10);
    private int maxOutputBytes = 64 * 1024;

    public String getJavaCommand() {
        return javaCommand;
    }

    public void setJavaCommand(String javaCommand) {
        this.javaCommand = javaCommand;
    }

    public String getJavacCommand() {
        return javacCommand;
    }

    public void setJavacCommand(String javacCommand) {
        this.javacCommand = javacCommand;
    }

    public Duration getExecutionTimeout() {
        return executionTimeout;
    }

    public void setExecutionTimeout(Duration executionTimeout) {
        this.executionTimeout = executionTimeout;
    }

    public Duration getCompilationTimeout() {
        return compilationTimeout;
    }

    public void setCompilationTimeout(Duration compilationTimeout) {
        this.compilationTimeout = compilationTimeout;
    }

    public int getMaxOutputBytes() {
        return maxOutputBytes;
    }

    public void setMaxOutputBytes(int maxOutputBytes) {
        this.maxOutputBytes = maxOutputBytes;
    }
}
