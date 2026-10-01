package com.institutionweb.mvp.journal;

import java.time.LocalDate;

public record IssueSummary(
        long id,
        String journalId,
        int volume,
        int issue,
        LocalDate publishedAt,
        String description,
        String status) {}
