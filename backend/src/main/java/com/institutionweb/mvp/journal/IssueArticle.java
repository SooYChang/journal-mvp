package com.institutionweb.mvp.journal;

import java.util.List;

public record IssueArticle(
        long id,
        String title,
        List<String> authors,
        String pages,
        String doi,
        String articleType,
        boolean hasPdf) {}
