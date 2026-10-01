package com.institutionweb.mvp.article;

import java.util.List;

public record JournalArticleFilterOptions(
        List<Integer> years,
        List<Integer> volumes,
        List<Integer> issues,
        List<String> articleTypes,
        List<String> keywords) {}
