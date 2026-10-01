package com.institutionweb.mvp.journal;

import java.util.List;

public record JournalDetail(
        String id,
        String name,
        String discipline,
        String description,
        String issnOnline,
        String publisher,
        Integer foundedYear,
        String frequency,
        String coverUrl,
        String aimsAndScope,
        String editorInChief,
        List<IssueSummary> issues) {}
