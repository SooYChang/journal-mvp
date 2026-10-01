package com.institutionweb.mvp.article;

import java.util.List;

public record GlobalArticleFilterOptions(
        List<JournalRef> journals,
        List<String> disciplines,
        List<Integer> years,
        List<String> articleTypes,
        List<String> keywords) {
    public record JournalRef(String id, String name) {}
}
