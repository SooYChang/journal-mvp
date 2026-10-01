package com.institutionweb.mvp.journal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.institutionweb.mvp.article.ArticleSummary;
import com.institutionweb.mvp.article.JsonLists;
import com.institutionweb.mvp.common.util.TextSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class JournalRepository {
    private static final String ARTICLE_SELECT =
            """
            SELECT a.id, a.title, a.authors_json, a.abstract_text, a.keywords_json, a.pages, a.doi,
                   a.article_type, a.published_at, a.citations, a.open_access, a.pdf_storage_key,
                   a.pdf_original_filename, a.pdf_size_bytes, a.uploaded_at, a.page_start, a.issue_id,
                   i.volume, i.issue, i.journal_id,
                   j.name AS journal_name, j.discipline, j.description AS journal_description,
                   j.issn_online, j.publisher, j.founded_year, j.frequency, j.cover_storage_key,
                   j.aims_and_scope, j.editor_in_chief
            FROM journal_articles a
            JOIN journal_issues i ON i.id = a.issue_id
            JOIN journals j ON j.id = i.journal_id
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public JournalRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public List<JournalSummary> listJournals(String query, String discipline, String sort, Integer size) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder sql = new StringBuilder(
                """
                SELECT id, name, discipline, description, issn_online, publisher, founded_year, frequency, cover_storage_key
                FROM journals
                WHERE deleted_at IS NULL
                """);
        if (query != null && !query.isBlank()) {
            sql.append(" AND (LOWER(name) LIKE :query OR LOWER(description) LIKE :query)");
            params.addValue("query", "%" + query.trim().toLowerCase() + "%");
        }
        if (discipline != null && !discipline.isBlank()) {
            sql.append(" AND discipline = :discipline");
            params.addValue("discipline", discipline);
        }
        if ("newest".equals(sort)) {
            sql.append(" ORDER BY created_at DESC, name ASC");
        } else {
            sql.append(" ORDER BY name ASC");
        }
        if (size != null) {
            sql.append(" LIMIT :size");
            params.addValue("size", size);
        }
        return jdbc.query(sql.toString(), params, (rs, rowNum) -> mapSummary(rs));
    }

    public List<String> listDisciplines() {
        return jdbc.query(
                """
                SELECT DISTINCT discipline FROM journals
                WHERE deleted_at IS NULL
                ORDER BY discipline
                """,
                (rs, rowNum) -> rs.getString("discipline"));
    }

    public Optional<JournalRow> findActive(String journalId) {
        List<JournalRow> rows = jdbc.query(
                "SELECT * FROM journals WHERE id = :id AND deleted_at IS NULL",
                new MapSqlParameterSource("id", journalId),
                (rs, rowNum) -> mapRow(rs));
        return rows.stream().findFirst();
    }

    public boolean slugExists(String id) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM journals WHERE id = :id",
                new MapSqlParameterSource("id", id),
                Integer.class);
        return count != null && count > 0;
    }

    public void insertJournal(JournalRow row) {
        jdbc.update(
                """
                INSERT INTO journals (
                    id, name, discipline, description, issn_online, publisher, founded_year, frequency,
                    aims_and_scope, editor_in_chief, cover_storage_key, cover_content_type, created_at, deleted_at
                ) VALUES (
                    :id, :name, :discipline, :description, :issnOnline, :publisher, :foundedYear, :frequency,
                    :aimsAndScope, :editorInChief, :coverKey, :coverType, :createdAt, NULL
                )
                """,
                journalParams(row));
    }

    public void updateCover(String id, String key, String contentType) {
        jdbc.update(
                """
                UPDATE journals SET cover_storage_key = :key, cover_content_type = :type WHERE id = :id
                """,
                new MapSqlParameterSource()
                        .addValue("id", id)
                        .addValue("key", key)
                        .addValue("type", contentType));
    }

    public void deleteJournal(String journalId) {
        int updated = jdbc.update(
                "UPDATE journals SET deleted_at = :now WHERE id = :id AND deleted_at IS NULL",
                new MapSqlParameterSource().addValue("id", journalId).addValue("now", Timestamp.from(Instant.now())));
        if (updated == 0) {
            throw com.institutionweb.mvp.common.api.ApiException.notFound("not_found", "Journal was not found.");
        }
    }

    public void deleteJournalRow(String journalId) {
        jdbc.update("DELETE FROM journals WHERE id = :id", new MapSqlParameterSource("id", journalId));
    }

    public List<IssueSummary> listIssues(String journalId, boolean includeDrafts) {
        MapSqlParameterSource params = new MapSqlParameterSource("journalId", journalId);
        String publishedOnly = includeDrafts ? "" : " AND status = 'PUBLISHED'";
        return jdbc.query(
                """
                SELECT id, journal_id, volume, issue, published_at, description, status
                FROM journal_issues
                WHERE journal_id = :journalId
                """
                        + publishedOnly
                        + " ORDER BY volume DESC, issue DESC",
                params,
                (rs, rowNum) -> mapIssue(rs));
    }

    public Optional<IssueSummary> findIssue(String journalId, long issueId) {
        List<IssueSummary> rows = jdbc.query(
                """
                SELECT i.id, i.journal_id, i.volume, i.issue, i.published_at, i.description, i.status
                FROM journal_issues i
                JOIN journals j ON j.id = i.journal_id
                WHERE i.id = :issueId AND i.journal_id = :journalId AND j.deleted_at IS NULL
                """,
                new MapSqlParameterSource().addValue("issueId", issueId).addValue("journalId", journalId),
                (rs, rowNum) -> mapIssue(rs));
        return rows.stream().findFirst();
    }

    public boolean issueDuplicate(String journalId, int volume, int issue) {
        Integer count = jdbc.queryForObject(
                """
                SELECT COUNT(*) FROM journal_issues
                WHERE journal_id = :journalId AND volume = :volume AND issue = :issue
                """,
                new MapSqlParameterSource()
                        .addValue("journalId", journalId)
                        .addValue("volume", volume)
                        .addValue("issue", issue),
                Integer.class);
        return count != null && count > 0;
    }

    public IssueSummary insertIssue(String journalId, int volume, int issue, LocalDate publishedAt, String description) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO journal_issues (journal_id, volume, issue, published_at, description, status)
                VALUES (:journalId, :volume, :issue, :publishedAt, :description, :status)
                """,
                new MapSqlParameterSource()
                        .addValue("journalId", journalId)
                        .addValue("volume", volume)
                        .addValue("issue", issue)
                        .addValue("publishedAt", publishedAt)
                        .addValue("description", description)
                        .addValue("status", IssueStatus.DRAFT),
                keys,
                new String[] {"id"});
        long id = keys.getKey().longValue();
        return new IssueSummary(id, journalId, volume, issue, publishedAt, description, IssueStatus.DRAFT);
    }

    public int publishIssue(String journalId, long issueId) {
        return jdbc.update(
                """
                UPDATE journal_issues
                SET status = :published
                WHERE id = :issueId AND journal_id = :journalId AND status = :draft
                """,
                new MapSqlParameterSource()
                        .addValue("issueId", issueId)
                        .addValue("journalId", journalId)
                        .addValue("published", IssueStatus.PUBLISHED)
                        .addValue("draft", IssueStatus.DRAFT));
    }

    public List<IssueArticle> listIssueArticles(long issueId) {
        return jdbc.query(
                """
                SELECT id, title, authors_json, pages, doi, article_type, pdf_storage_key
                FROM journal_articles
                WHERE issue_id = :issueId AND deleted_at IS NULL
                ORDER BY CASE WHEN page_start IS NULL THEN 1 ELSE 0 END, page_start ASC, id ASC
                """,
                new MapSqlParameterSource("issueId", issueId),
                (rs, rowNum) -> new IssueArticle(
                        rs.getLong("id"),
                        rs.getString("title"),
                        JsonLists.read(objectMapper, rs.getString("authors_json")),
                        rs.getString("pages"),
                        rs.getString("doi"),
                        rs.getString("article_type"),
                        rs.getString("pdf_storage_key") != null));
    }

    public Optional<ArticleRow> findActiveArticle(String journalId, long articleId) {
        List<ArticleRow> rows = jdbc.query(
                ARTICLE_SELECT + " WHERE a.id = :articleId AND i.journal_id = :journalId AND a.deleted_at IS NULL AND j.deleted_at IS NULL",
                new MapSqlParameterSource().addValue("articleId", articleId).addValue("journalId", journalId),
                (rs, rowNum) -> mapArticle(rs));
        return rows.stream().findFirst();
    }

    public Optional<ArticleRow> findActiveArticleById(long articleId) {
        List<ArticleRow> rows = jdbc.query(
                ARTICLE_SELECT + " WHERE a.id = :articleId AND a.deleted_at IS NULL AND j.deleted_at IS NULL",
                new MapSqlParameterSource("articleId", articleId),
                (rs, rowNum) -> mapArticle(rs));
        return rows.stream().findFirst();
    }

    public void softDeleteArticle(String journalId, long articleId) {
        int updated = jdbc.update(
                """
                UPDATE journal_articles a
                SET deleted_at = :now
                WHERE a.id = :articleId
                  AND a.deleted_at IS NULL
                  AND EXISTS (
                    SELECT 1 FROM journal_issues i
                    JOIN journals j ON j.id = i.journal_id
                    WHERE i.id = a.issue_id AND i.journal_id = :journalId AND j.deleted_at IS NULL
                  )
                """,
                new MapSqlParameterSource()
                        .addValue("articleId", articleId)
                        .addValue("journalId", journalId)
                        .addValue("now", Timestamp.from(Instant.now())));
        if (updated == 0) {
            throw com.institutionweb.mvp.common.api.ApiException.notFound("not_found", "Article was not found.");
        }
    }

    public long insertArticle(ArticleInsert insert) {
        GeneratedKeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                """
                INSERT INTO journal_articles (
                    issue_id, title, authors_json, abstract_text, keywords_json, pages, page_start, doi,
                    article_type, published_at, citations, open_access, pdf_storage_key, pdf_original_filename,
                    pdf_content_type, pdf_size_bytes, uploaded_at, created_at, deleted_at
                ) VALUES (
                    :issueId, :title, :authors, :abstractText, :keywords, :pages, :pageStart, :doi,
                    :articleType, :publishedAt, :citations, :openAccess, :pdfKey, :pdfName,
                    :pdfType, :pdfSize, :uploadedAt, :createdAt, NULL
                )
                """,
                new MapSqlParameterSource()
                        .addValue("issueId", insert.issueId())
                        .addValue("title", insert.title())
                        .addValue("authors", insert.authorsJson())
                        .addValue("abstractText", insert.abstractText())
                        .addValue("keywords", insert.keywordsJson())
                        .addValue("pages", insert.pages())
                        .addValue("pageStart", insert.pageStart())
                        .addValue("doi", insert.doi())
                        .addValue("articleType", insert.articleType())
                        .addValue("publishedAt", insert.publishedAt())
                        .addValue("citations", insert.citations())
                        .addValue("openAccess", insert.openAccess())
                        .addValue("pdfKey", insert.pdfStorageKey())
                        .addValue("pdfName", insert.pdfOriginalFilename())
                        .addValue("pdfType", insert.pdfContentType())
                        .addValue("pdfSize", insert.pdfSizeBytes())
                        .addValue("uploadedAt", Timestamp.from(insert.uploadedAt()))
                        .addValue("createdAt", Timestamp.from(insert.createdAt())),
                keys,
                new String[] {"id"});
        return keys.getKey().longValue();
    }

    public boolean doiExists(String doi) {
        if (doi == null || doi.isBlank()) {
            return false;
        }
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM journal_articles WHERE doi = :doi",
                new MapSqlParameterSource("doi", doi),
                Integer.class);
        return count != null && count > 0;
    }

    public void deleteArticleRow(long id) {
        jdbc.update("DELETE FROM journal_articles WHERE id = :id", new MapSqlParameterSource("id", id));
    }

    public void updatePdfKey(long id, String key) {
        jdbc.update(
                "UPDATE journal_articles SET pdf_storage_key = :key WHERE id = :id",
                new MapSqlParameterSource().addValue("id", id).addValue("key", key));
    }

    public JournalSummary toSummary(JournalRow row) {
        return new JournalSummary(
                row.id(),
                row.name(),
                row.discipline(),
                row.description(),
                row.issnOnline(),
                row.publisher(),
                row.foundedYear(),
                row.frequency(),
                coverUrl(row.id(), row.coverStorageKey()));
    }

    public ArticleSummary toSummary(ArticleRow row) {
        return new ArticleSummary(
                row.id(),
                row.journalId(),
                row.journalName(),
                row.discipline(),
                row.title(),
                JsonLists.read(objectMapper, row.authorsJson()),
                TextSupport.preview(row.abstractText(), 240),
                JsonLists.read(objectMapper, row.keywordsJson()),
                row.volume(),
                row.issue(),
                row.pages(),
                row.doi(),
                row.articleType(),
                row.publishedAt(),
                row.citations(),
                row.openAccess(),
                row.pdfStorageKey() != null);
    }

    public com.institutionweb.mvp.article.JournalArticleDetail toDetail(ArticleRow row) {
        JournalSummary journal = new JournalSummary(
                row.journalId(),
                row.journalName(),
                row.discipline(),
                row.journalDescription(),
                row.issnOnline(),
                row.publisher(),
                row.foundedYear(),
                row.frequency(),
                coverUrl(row.journalId(), row.coverStorageKey()));
        return new com.institutionweb.mvp.article.JournalArticleDetail(
                row.id(),
                row.journalId(),
                row.journalName(),
                row.discipline(),
                row.title(),
                JsonLists.read(objectMapper, row.authorsJson()),
                TextSupport.preview(row.abstractText(), 240),
                row.abstractText(),
                JsonLists.read(objectMapper, row.keywordsJson()),
                row.volume(),
                row.issue(),
                row.issueId(),
                row.pages(),
                row.doi(),
                row.articleType(),
                row.publishedAt(),
                row.citations(),
                row.openAccess(),
                row.pdfStorageKey() != null,
                row.pdfOriginalFilename(),
                row.pdfSizeBytes(),
                row.uploadedAt(),
                journal);
    }

    public static String coverUrl(String journalId, String coverKey) {
        return coverKey == null || coverKey.isBlank() ? null : "/api/journals/" + journalId + "/cover";
    }

    private IssueSummary mapIssue(ResultSet rs) throws SQLException {
        return new IssueSummary(
                rs.getLong("id"),
                rs.getString("journal_id"),
                rs.getInt("volume"),
                rs.getInt("issue"),
                rs.getObject("published_at", LocalDate.class),
                rs.getString("description"),
                rs.getString("status"));
    }

    private JournalSummary mapSummary(ResultSet rs) throws SQLException {
        String id = rs.getString("id");
        return new JournalSummary(
                id,
                rs.getString("name"),
                rs.getString("discipline"),
                rs.getString("description"),
                rs.getString("issn_online"),
                rs.getString("publisher"),
                rs.getInt("founded_year"),
                rs.getString("frequency"),
                coverUrl(id, rs.getString("cover_storage_key")));
    }

    private JournalRow mapRow(ResultSet rs) throws SQLException {
        return new JournalRow(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("discipline"),
                rs.getString("description"),
                rs.getString("issn_online"),
                rs.getString("publisher"),
                rs.getInt("founded_year"),
                rs.getString("frequency"),
                rs.getString("aims_and_scope"),
                rs.getString("editor_in_chief"),
                rs.getString("cover_storage_key"),
                rs.getString("cover_content_type"),
                instant(rs, "created_at"));
    }

    private ArticleRow mapArticle(ResultSet rs) throws SQLException {
        return new ArticleRow(
                rs.getLong("id"),
                rs.getString("journal_id"),
                rs.getString("journal_name"),
                rs.getString("discipline"),
                rs.getString("title"),
                rs.getString("authors_json"),
                rs.getString("abstract_text"),
                rs.getString("keywords_json"),
                rs.getObject("volume", Integer.class),
                rs.getObject("issue", Integer.class),
                rs.getLong("issue_id"),
                rs.getString("pages"),
                rs.getString("doi"),
                rs.getString("article_type"),
                rs.getObject("published_at", LocalDate.class),
                rs.getInt("citations"),
                rs.getBoolean("open_access"),
                rs.getString("pdf_storage_key"),
                rs.getString("pdf_original_filename"),
                rs.getObject("pdf_size_bytes", Long.class),
                instant(rs, "uploaded_at"),
                rs.getString("journal_description"),
                rs.getString("issn_online"),
                rs.getString("publisher"),
                rs.getObject("founded_year", Integer.class),
                rs.getString("frequency"),
                rs.getString("cover_storage_key"),
                rs.getString("aims_and_scope"),
                rs.getString("editor_in_chief"));
    }

    private MapSqlParameterSource journalParams(JournalRow row) {
        return new MapSqlParameterSource()
                .addValue("id", row.id())
                .addValue("name", row.name())
                .addValue("discipline", row.discipline())
                .addValue("description", row.description())
                .addValue("issnOnline", row.issnOnline())
                .addValue("publisher", row.publisher())
                .addValue("foundedYear", row.foundedYear())
                .addValue("frequency", row.frequency())
                .addValue("aimsAndScope", row.aimsAndScope())
                .addValue("editorInChief", row.editorInChief())
                .addValue("coverKey", row.coverStorageKey())
                .addValue("coverType", row.coverContentType())
                .addValue("createdAt", Timestamp.from(row.createdAt()));
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    public record JournalRow(
            String id,
            String name,
            String discipline,
            String description,
            String issnOnline,
            String publisher,
            int foundedYear,
            String frequency,
            String aimsAndScope,
            String editorInChief,
            String coverStorageKey,
            String coverContentType,
            Instant createdAt) {}

    public record ArticleRow(
            long id,
            String journalId,
            String journalName,
            String discipline,
            String title,
            String authorsJson,
            String abstractText,
            String keywordsJson,
            Integer volume,
            Integer issue,
            long issueId,
            String pages,
            String doi,
            String articleType,
            LocalDate publishedAt,
            int citations,
            boolean openAccess,
            String pdfStorageKey,
            String pdfOriginalFilename,
            Long pdfSizeBytes,
            Instant uploadedAt,
            String journalDescription,
            String issnOnline,
            String publisher,
            Integer foundedYear,
            String frequency,
            String coverStorageKey,
            String aimsAndScope,
            String editorInChief) {}

    public record ArticleInsert(
            long issueId,
            String title,
            String authorsJson,
            String abstractText,
            String keywordsJson,
            String pages,
            Integer pageStart,
            String doi,
            String articleType,
            LocalDate publishedAt,
            int citations,
            boolean openAccess,
            String pdfStorageKey,
            String pdfOriginalFilename,
            String pdfContentType,
            long pdfSizeBytes,
            Instant uploadedAt,
            Instant createdAt) {}
}
