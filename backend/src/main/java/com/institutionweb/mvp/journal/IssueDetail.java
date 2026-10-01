package com.institutionweb.mvp.journal;

import java.time.LocalDate;
import java.util.List;

public record IssueDetail(
        long id,
        String journalId,
        int volume,
        int issue,
        LocalDate publishedAt,
        String description,
        String status,
        List<IssueArticle> articles) {}
