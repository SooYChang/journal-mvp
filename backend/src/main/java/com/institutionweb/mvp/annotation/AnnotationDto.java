package com.institutionweb.mvp.annotation;

import java.time.Instant;
import java.util.List;

public record AnnotationDto(
        long id,
        long articleId,
        Author author,
        int pageNumber,
        String selectedText,
        String positionData,
        String body,
        String status,
        Instant createdAt,
        Instant updatedAt,
        boolean canEdit,
        boolean canResolve,
        List<ReplyDto> replies) {
    public record Author(long id, String displayName) {}

    public record ReplyDto(long id, Author author, String body, Instant createdAt) {}
}
