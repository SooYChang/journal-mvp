package com.institutionweb.mvp.article;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record ArticleSummary(
        long id,
        String journalId,
        String journalName,
        String discipline,
        String title,
        List<String> authors,
        String abstractPreview,
        List<String> keywords,
        Integer volume,
        Integer issue,
        String pages,
        String doi,
        String articleType,
        LocalDate publishedAt,
        int citations,
        boolean openAccess,
        boolean hasPdf) {}
