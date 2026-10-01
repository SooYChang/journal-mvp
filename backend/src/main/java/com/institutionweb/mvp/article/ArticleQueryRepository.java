package com.institutionweb.mvp.article;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.institutionweb.mvp.common.api.PageResponse;
import com.institutionweb.mvp.common.util.TextSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ArticleQueryRepository {
    private static final String FROM =
            """
            FROM journal_articles a
            JOIN journal_issues i ON i.id = a.issue_id
            JOIN journals j ON j.id = i.journal_id
            WHERE a.deleted_at IS NULL AND j.deleted_at IS NULL AND i.status = 'PUBLISHED'
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public ArticleQueryRepository(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public PageResponse<ArticleSummary> search(ArticleSearchQuery query) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        String where = buildWhere(query, params);
        Long totalValue = jdbc.queryForObject("SELECT COUNT(*) " + FROM + where, params, Long.class);
        long total = totalValue == null ? 0L : totalValue;
        String order = orderBy(query);
        params.addValue("limit", query.size());
        params.addValue("offset", (long) query.page() * query.size());
        List<ArticleSummary> content = jdbc.query(
                """
                SELECT a.id, a.title, a.authors_json, a.abstract_text, a.keywords_json, a.pages, a.doi,
                       a.article_type, a.published_at, a.citations, a.open_access, a.pdf_storage_key,
                       i.volume, i.issue, i.journal_id, j.name AS journal_name, j.discipline
                """
                        + FROM + where + order + " LIMIT :limit OFFSET :offset",
                params,
                (rs, rowNum) -> mapSummary(rs));
        return PageResponse.of(content, query.page(), query.size(), total);
    }

    public JournalArticleFilterOptions journalFilterOptions(String journalId) {
        MapSqlParameterSource params = new MapSqlParameterSource("journalId", journalId);
        String scoped = FROM + " AND j.id = :journalId";
        List<Integer> years = jdbc.query(
                "SELECT DISTINCT EXTRACT(YEAR FROM a.published_at) AS year " + scoped + " ORDER BY year DESC",
                params,
                (rs, rowNum) -> rs.getInt("year"));
        List<Integer> volumes = jdbc.query(
                "SELECT DISTINCT i.volume " + scoped + " ORDER BY i.volume DESC",
                params,
                (rs, rowNum) -> rs.getInt("volume"));
        List<Integer> issues = jdbc.query(
                "SELECT DISTINCT i.issue " + scoped + " ORDER BY i.issue ASC",
                params,
                (rs, rowNum) -> rs.getInt("issue"));
        List<String> types = jdbc.query(
                "SELECT DISTINCT a.article_type " + scoped + " ORDER BY a.article_type",
                params,
                (rs, rowNum) -> rs.getString("article_type"));
        List<String> keywords = distinctKeywords(jdbc.query(
                "SELECT a.keywords_json " + scoped, params, (rs, rowNum) -> rs.getString("keywords_json")));
        return new JournalArticleFilterOptions(years, volumes, issues, types, keywords);
    }

    public GlobalArticleFilterOptions globalFilterOptions() {
        List<GlobalArticleFilterOptions.JournalRef> journals = jdbc.query(
                """
                SELECT DISTINCT j.id, j.name
                FROM journals j
                JOIN journal_issues i ON i.journal_id = j.id
                JOIN journal_articles a ON a.issue_id = i.id
                WHERE j.deleted_at IS NULL AND a.deleted_at IS NULL AND i.status = 'PUBLISHED'
                ORDER BY j.name
                """,
                (rs, rowNum) -> new GlobalArticleFilterOptions.JournalRef(rs.getString("id"), rs.getString("name")));
        List<String> disciplines = jdbc.query(
                """
                SELECT DISTINCT j.discipline
                FROM journals j
                JOIN journal_issues i ON i.journal_id = j.id
                JOIN journal_articles a ON a.issue_id = i.id
                WHERE j.deleted_at IS NULL AND a.deleted_at IS NULL AND i.status = 'PUBLISHED'
                ORDER BY j.discipline
                """,
                (rs, rowNum) -> rs.getString("discipline"));
        List<Integer> years = jdbc.query(
                "SELECT DISTINCT EXTRACT(YEAR FROM a.published_at) AS year " + FROM + " ORDER BY year DESC",
                (rs, rowNum) -> rs.getInt("year"));
        List<String> types = jdbc.query(
                "SELECT DISTINCT a.article_type " + FROM + " ORDER BY a.article_type",
                (rs, rowNum) -> rs.getString("article_type"));
        List<String> keywords = distinctKeywords(
                jdbc.query("SELECT a.keywords_json " + FROM, (rs, rowNum) -> rs.getString("keywords_json")));
        return new GlobalArticleFilterOptions(journals, disciplines, years, types, keywords);
    }

    private List<String> distinctKeywords(List<String> jsonRows) {
        Set<String> values = new LinkedHashSet<>();
        for (String json : jsonRows) {
            values.addAll(JsonLists.read(objectMapper, json));
        }
        return values.stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
    }

    private String buildWhere(ArticleSearchQuery query, MapSqlParameterSource params) {
        StringBuilder sql = new StringBuilder();
        if (query.journalId() != null && !query.journalId().isBlank()) {
            sql.append(" AND j.id = :journalId");
            params.addValue("journalId", query.journalId());
        }
        if (query.discipline() != null && !query.discipline().isBlank()) {
            sql.append(" AND j.discipline = :discipline");
            params.addValue("discipline", query.discipline());
        }
        if (query.year() != null) {
            sql.append(" AND EXTRACT(YEAR FROM a.published_at) = :year");
            params.addValue("year", query.year());
        }
        if (query.volume() != null) {
            sql.append(" AND i.volume = :volume");
            params.addValue("volume", query.volume());
        }
        if (query.issue() != null) {
            sql.append(" AND i.issue = :issueNo");
            params.addValue("issueNo", query.issue());
        }
        if (query.articleType() != null && !query.articleType().isBlank()) {
            sql.append(" AND a.article_type = :articleType");
            params.addValue("articleType", query.articleType());
        }
        if (query.openAccess() != null) {
            sql.append(" AND a.open_access = :openAccess");
            params.addValue("openAccess", query.openAccess());
        }
        if (query.hasPdf() != null) {
            if (query.hasPdf()) {
                sql.append(" AND a.pdf_storage_key IS NOT NULL");
            } else {
                sql.append(" AND a.pdf_storage_key IS NULL");
            }
        }
        String q = TextSupport.trimToNull(query.query());
        if (q != null) {
            sql.append(
                    """
                     AND (
                       LOWER(a.title) LIKE :q
                       OR LOWER(a.abstract_text) LIKE :q
                       OR LOWER(a.authors_json) LIKE :q
                       OR LOWER(a.keywords_json) LIKE :q
                       OR LOWER(COALESCE(a.doi, '')) LIKE :q
                     )
                    """);
            params.addValue("q", "%" + q.toLowerCase() + "%");
        }
        return sql.toString();
    }

    private String orderBy(ArticleSearchQuery query) {
        String secondary = ", a.id ASC";
        String q = TextSupport.trimToNull(query.query());
        return switch (query.sort() == null ? "newest" : query.sort()) {
            case "title" -> " ORDER BY LOWER(a.title) ASC" + secondary;
            case "citations" -> " ORDER BY a.citations DESC" + secondary;
            case "relevance" -> q == null
                    ? " ORDER BY a.published_at DESC, a.id DESC"
                    : """
                       ORDER BY CASE
                         WHEN LOWER(a.title) LIKE :q THEN 0
                         WHEN LOWER(a.keywords_json) LIKE :q THEN 1
                         WHEN LOWER(a.authors_json) LIKE :q THEN 2
                         ELSE 3
                       END, a.published_at DESC, a.id DESC
                      """;
            default -> " ORDER BY a.published_at DESC, a.id DESC";
        };
    }

    private ArticleSummary mapSummary(ResultSet rs) throws SQLException {
        return new ArticleSummary(
                rs.getLong("id"),
                rs.getString("journal_id"),
                rs.getString("journal_name"),
                rs.getString("discipline"),
                rs.getString("title"),
                JsonLists.read(objectMapper, rs.getString("authors_json")),
                TextSupport.preview(rs.getString("abstract_text"), 240),
                JsonLists.read(objectMapper, rs.getString("keywords_json")),
                rs.getObject("volume", Integer.class),
                rs.getObject("issue", Integer.class),
                rs.getString("pages"),
                rs.getString("doi"),
                rs.getString("article_type"),
                rs.getObject("published_at", LocalDate.class),
                rs.getInt("citations"),
                rs.getBoolean("open_access"),
                rs.getString("pdf_storage_key") != null);
    }

    public record ArticleSearchQuery(
            String query,
            String journalId,
            String discipline,
            Integer year,
            Integer volume,
            Integer issue,
            String articleType,
            Boolean openAccess,
            Boolean hasPdf,
            String sort,
            int page,
            int size) {}
}
