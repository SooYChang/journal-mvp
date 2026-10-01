package com.institutionweb.mvp.journal;

import java.time.LocalDate;
import java.util.List;

public record JournalSummary(
        String id,
        String name,
        String discipline,
        String description,
        String issnOnline,
        String publisher,
        Integer foundedYear,
        String frequency,
        String coverUrl) {}
