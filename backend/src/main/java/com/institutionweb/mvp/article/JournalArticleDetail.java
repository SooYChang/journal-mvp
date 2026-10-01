package com.institutionweb.mvp.article;

import com.institutionweb.mvp.journal.JournalSummary;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record JournalArticleDetail(
        long id,
        String journalId,
        String journalName,
        String discipline,
        String title,
        List<String> authors,
        String abstractPreview,
        String abstractText,
        List<String> keywords,
        Integer volume,
        Integer issue,
        Long issueId,
        String pages,
        String doi,
        String articleType,
        LocalDate publishedAt,
        int citations,
        boolean openAccess,
        boolean hasPdf,
        String pdfOriginalFilename,
        Long pdfSizeBytes,
        Instant uploadedAt,
        JournalSummary journal) {}
