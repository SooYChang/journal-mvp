package com.institutionweb.mvp.annotation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.institutionweb.mvp.auth.AuthService;
import com.institutionweb.mvp.auth.SessionUser;
import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.journal.JournalRepository;
import com.institutionweb.mvp.user.UserRecord;
import com.institutionweb.mvp.user.UserRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnotationService {
    private final NamedParameterJdbcTemplate jdbc;
    private final JournalRepository journals;
    private final UserRepository users;
    private final ObjectMapper objectMapper;

    public AnnotationService(
            NamedParameterJdbcTemplate jdbc,
            JournalRepository journals,
            UserRepository users,
            ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.journals = journals;
        this.users = users;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<AnnotationDto> list(String journalId, long articleId) {
        requireArticle(journalId, articleId);
        SessionUser current = AuthService.currentUser();
        List<AnnotationRow> rows = jdbc.query(
                """
                SELECT an.*, u.display_name
                FROM article_annotations an
                JOIN users u ON u.id = an.author_user_id
                WHERE an.article_id = :articleId
                ORDER BY an.created_at ASC, an.id ASC
                """,
                new MapSqlParameterSource("articleId", articleId),
                (rs, rowNum) -> mapAnnotation(rs));
        Map<Long, List<AnnotationDto.ReplyDto>> replies = loadReplies(rows.stream().map(AnnotationRow::id).toList());
        List<AnnotationDto> result = new ArrayList<>();
        for (AnnotationRow row : rows) {
            result.add(toDto(row, replies.getOrDefault(row.id(), List.of()), current));
        }
        return result;
    }

    @Transactional
    public AnnotationDto create(String journalId, long articleId, CreateRequest request) {
        requireArticle(journalId, articleId);
        SessionUser current = AuthService.currentUser();
        validateCreate(request);
        Instant now = Instant.now();
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO article_annotations (
                    article_id, author_user_id, page_number, selected_text, position_data, body, status, created_at, updated_at
                ) VALUES (
                    :articleId, :authorId, :pageNumber, :selectedText, :positionData, :body, 'OPEN', :now, :now
                )
                """,
                new MapSqlParameterSource()
                        .addValue("articleId", articleId)
                        .addValue("authorId", current.id())
                        .addValue("pageNumber", request.pageNumber())
                        .addValue("selectedText", request.selectedText().trim())
                        .addValue("positionData", request.positionData())
                        .addValue("body", request.body().trim())
                        .addValue("now", Timestamp.from(now)),
                keys,
                new String[] {"id"});
        return getOne(journalId, articleId, keys.getKey().longValue());
    }

    @Transactional
    public AnnotationDto patch(String journalId, long articleId, long annotationId, PatchRequest request) {
        AnnotationRow existing = requireOwnedAnnotation(journalId, articleId, annotationId);
        SessionUser current = AuthService.currentUser();
        boolean author = existing.authorUserId() == current.id();
        if (!author && !current.isAdmin()) {
            throw ApiException.forbidden("You cannot modify this annotation.");
        }
        String body = existing.body();
        String status = existing.status();
        if (request.body() != null) {
            if (!author) {
                throw ApiException.forbidden("Only the author can edit annotation text.");
            }
            String trimmed = request.body().trim();
            if (trimmed.isEmpty() || trimmed.length() > 5000) {
                throw ApiException.validation("Annotation body must be 1 to 5000 characters.");
            }
            body = trimmed;
        }
        if (request.status() != null) {
            if (!current.isAdmin()) {
                throw ApiException.forbidden("Only administrators can change annotation status.");
            }
            if (!"OPEN".equals(request.status()) && !"RESOLVED".equals(request.status())) {
                throw ApiException.validation("Status must be OPEN or RESOLVED.");
            }
            status = request.status();
        }
        jdbc.update(
                """
                UPDATE article_annotations
                SET body = :body, status = :status, updated_at = :now
                WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("body", body)
                        .addValue("status", status)
                        .addValue("now", Timestamp.from(Instant.now()))
                        .addValue("id", annotationId));
        return getOne(journalId, articleId, annotationId);
    }

    @Transactional
    public void delete(String journalId, long articleId, long annotationId) {
        AnnotationRow existing = requireOwnedAnnotation(journalId, articleId, annotationId);
        SessionUser current = AuthService.currentUser();
        if (existing.authorUserId() != current.id() && !current.isAdmin()) {
            throw ApiException.forbidden("You cannot delete this annotation.");
        }
        jdbc.update(
                "DELETE FROM article_annotation_replies WHERE annotation_id = :id",
                new MapSqlParameterSource("id", annotationId));
        jdbc.update("DELETE FROM article_annotations WHERE id = :id", new MapSqlParameterSource("id", annotationId));
    }

    @Transactional
    public AnnotationDto.ReplyDto reply(String journalId, long articleId, long annotationId, ReplyRequest request) {
        requireOwnedAnnotation(journalId, articleId, annotationId);
        SessionUser current = AuthService.currentUser();
        if (request == null || request.body() == null || request.body().trim().isEmpty() || request.body().trim().length() > 3000) {
            throw ApiException.validation("Reply body must be 1 to 3000 characters.");
        }
        Instant now = Instant.now();
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO article_annotation_replies (annotation_id, author_user_id, body, created_at)
                VALUES (:annotationId, :authorId, :body, :now)
                """,
                new MapSqlParameterSource()
                        .addValue("annotationId", annotationId)
                        .addValue("authorId", current.id())
                        .addValue("body", request.body().trim())
                        .addValue("now", Timestamp.from(now)),
                keys,
                new String[] {"id"});
        return new AnnotationDto.ReplyDto(
                keys.getKey().longValue(),
                new AnnotationDto.Author(current.id(), current.displayName()),
                request.body().trim(),
                now);
    }

    private AnnotationDto getOne(String journalId, long articleId, long annotationId) {
        return list(journalId, articleId).stream()
                .filter(item -> item.id() == annotationId)
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("not_found", "Annotation was not found."));
    }

    private AnnotationRow requireOwnedAnnotation(String journalId, long articleId, long annotationId) {
        requireArticle(journalId, articleId);
        List<AnnotationRow> rows = jdbc.query(
                """
                SELECT an.*, u.display_name
                FROM article_annotations an
                JOIN users u ON u.id = an.author_user_id
                WHERE an.id = :id AND an.article_id = :articleId
                """,
                new MapSqlParameterSource().addValue("id", annotationId).addValue("articleId", articleId),
                (rs, rowNum) -> mapAnnotation(rs));
        if (rows.isEmpty()) {
            throw ApiException.notFound("not_found", "Annotation was not found.");
        }
        return rows.get(0);
    }

    private void requireArticle(String journalId, long articleId) {
        JournalRepository.ArticleRow row = journals.findActiveArticle(journalId, articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        var issue = journals.findIssue(journalId, row.issueId())
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        if (!com.institutionweb.mvp.journal.IssueStatus.isPublished(issue.status()) && !AuthService.isCurrentAdmin()) {
            throw ApiException.notFound("not_found", "Article was not found.");
        }
    }

    private void validateCreate(CreateRequest request) {
        if (request == null) {
            throw ApiException.validation("Annotation is required.");
        }
        if (request.pageNumber() < 1) {
            throw ApiException.validation("Page number is required.");
        }
        if (request.selectedText() == null || request.selectedText().trim().isEmpty() || request.selectedText().trim().length() > 2000) {
            throw ApiException.validation("Selected text must be 1 to 2000 characters.");
        }
        if (request.body() == null || request.body().trim().isEmpty() || request.body().trim().length() > 5000) {
            throw ApiException.validation("Annotation body must be 1 to 5000 characters.");
        }
        validatePosition(request.positionData());
    }

    private void validatePosition(String positionData) {
        if (positionData == null || positionData.isBlank()) {
            throw ApiException.validation("Position data is required.");
        }
        try {
            JsonNode root = objectMapper.readTree(positionData);
            if (root.path("version").asInt() != 1) {
                throw ApiException.validation("Unsupported position data version.");
            }
            JsonNode pages = root.path("pages");
            if (!pages.isArray() || pages.isEmpty() || pages.size() > 50) {
                throw ApiException.validation("Position data pages are invalid.");
            }
            for (JsonNode page : pages) {
                int pageNumber = page.path("pageNumber").asInt();
                if (pageNumber < 1) {
                    throw ApiException.validation("Position page number is invalid.");
                }
                JsonNode rects = page.path("rects");
                if (!rects.isArray() || rects.isEmpty() || rects.size() > 100) {
                    throw ApiException.validation("Position rectangles are invalid.");
                }
                for (JsonNode rect : rects) {
                    double left = rect.path("left").asDouble(Double.NaN);
                    double top = rect.path("top").asDouble(Double.NaN);
                    double width = rect.path("width").asDouble(Double.NaN);
                    double height = rect.path("height").asDouble(Double.NaN);
                    if (!inUnit(left) || !inUnit(top) || !inUnit(width) || !inUnit(height)) {
                        throw ApiException.validation("Position rectangle values must be between 0 and 1.");
                    }
                }
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw ApiException.validation("Position data is invalid JSON.");
        }
    }

    private boolean inUnit(double value) {
        return !Double.isNaN(value) && value >= 0 && value <= 1;
    }

    private Map<Long, List<AnnotationDto.ReplyDto>> loadReplies(List<Long> annotationIds) {
        Map<Long, List<AnnotationDto.ReplyDto>> map = new LinkedHashMap<>();
        if (annotationIds.isEmpty()) {
            return map;
        }
        List<AnnotationDto.ReplyDto> unused = jdbc.query(
                """
                SELECT r.id, r.annotation_id, r.body, r.created_at, r.author_user_id, u.display_name
                FROM article_annotation_replies r
                JOIN users u ON u.id = r.author_user_id
                WHERE r.annotation_id IN (:ids)
                ORDER BY r.created_at ASC, r.id ASC
                """,
                new MapSqlParameterSource("ids", annotationIds),
                (rs, rowNum) -> {
                    long annotationId = rs.getLong("annotation_id");
                    AnnotationDto.ReplyDto reply = new AnnotationDto.ReplyDto(
                            rs.getLong("id"),
                            new AnnotationDto.Author(rs.getLong("author_user_id"), rs.getString("display_name")),
                            rs.getString("body"),
                            instant(rs, "created_at"));
                    map.computeIfAbsent(annotationId, key -> new ArrayList<>()).add(reply);
                    return reply;
                });
        return map;
    }

    private AnnotationDto toDto(AnnotationRow row, List<AnnotationDto.ReplyDto> replies, SessionUser current) {
        boolean author = row.authorUserId() == current.id();
        return new AnnotationDto(
                row.id(),
                row.articleId(),
                new AnnotationDto.Author(row.authorUserId(), row.authorName()),
                row.pageNumber(),
                row.selectedText(),
                row.positionData(),
                row.body(),
                row.status(),
                row.createdAt(),
                row.updatedAt(),
                author,
                current.isAdmin(),
                replies);
    }

    private AnnotationRow mapAnnotation(ResultSet rs) throws SQLException {
        return new AnnotationRow(
                rs.getLong("id"),
                rs.getLong("article_id"),
                rs.getLong("author_user_id"),
                rs.getString("display_name"),
                rs.getInt("page_number"),
                rs.getString("selected_text"),
                rs.getString("position_data"),
                rs.getString("body"),
                rs.getString("status"),
                instant(rs, "created_at"),
                instant(rs, "updated_at"));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private record AnnotationRow(
            long id,
            long articleId,
            long authorUserId,
            String authorName,
            int pageNumber,
            String selectedText,
            String positionData,
            String body,
            String status,
            Instant createdAt,
            Instant updatedAt) {}

    public record CreateRequest(int pageNumber, String selectedText, String positionData, String body) {}

    public record PatchRequest(String body, String status) {}

    public record ReplyRequest(String body) {}
}
