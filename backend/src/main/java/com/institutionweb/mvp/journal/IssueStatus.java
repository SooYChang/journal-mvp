package com.institutionweb.mvp.journal;

public final class IssueStatus {
    public static final String DRAFT = "DRAFT";
    public static final String PUBLISHED = "PUBLISHED";

    private IssueStatus() {}

    public static boolean isPublished(String status) {
        return PUBLISHED.equals(status);
    }
}
