package com.institutionweb.mvp.journal;

import com.institutionweb.mvp.article.ArticleQueryRepository;
import com.institutionweb.mvp.article.ArticleQueryRepository.ArticleSearchQuery;
import com.institutionweb.mvp.article.ArticleSummary;
import com.institutionweb.mvp.article.JournalArticleDetail;
import com.institutionweb.mvp.article.JournalArticleFilterOptions;
import com.institutionweb.mvp.auth.AuthService;
import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.common.api.PageResponse;
import com.institutionweb.mvp.common.util.TextSupport;
import com.institutionweb.mvp.storage.FileMagic;
import com.institutionweb.mvp.storage.ObjectStorage;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class JournalService {
    private final JournalRepository journals;
    private final ArticleQueryRepository articles;
    private final ObjectStorage objectStorage;

    public JournalService(JournalRepository journals, ArticleQueryRepository articles, ObjectStorage objectStorage) {
        this.journals = journals;
        this.articles = articles;
        this.objectStorage = objectStorage;
    }

    @Transactional(readOnly = true)
    public List<JournalSummary> list(String query, String discipline, String sort, Integer size) {
        String normalizedSort = "newest".equals(sort) ? "newest" : "name";
        Integer limited = size == null ? null : Math.min(Math.max(size, 1), 100);
        return journals.listJournals(query, discipline, normalizedSort, limited);
    }

    @Transactional(readOnly = true)
    public List<String> disciplines() {
        return journals.listDisciplines();
    }

    @Transactional(readOnly = true)
    public JournalDetail get(String journalId) {
        JournalRepository.JournalRow row = requireJournal(journalId);
        return new JournalDetail(
                row.id(),
                row.name(),
                row.discipline(),
                row.description(),
                row.issnOnline(),
                row.publisher(),
                row.foundedYear(),
                row.frequency(),
                JournalRepository.coverUrl(row.id(), row.coverStorageKey()),
                row.aimsAndScope(),
                row.editorInChief(),
                journals.listIssues(journalId, AuthService.isCurrentAdmin()));
    }

    @Transactional(readOnly = true)
    public IssueDetail getIssue(String journalId, long issueId) {
        return toIssueDetail(requirePublishedIssue(journalId, issueId));
    }

    @Transactional(readOnly = true)
    public IssueDetail getIssueForAdmin(String journalId, long issueId) {
        AuthService.currentAdmin();
        return toIssueDetail(requireIssue(journalId, issueId));
    }

    @Transactional
    public IssueSummary publishIssue(String journalId, long issueId) {
        AuthService.currentAdmin();
        IssueSummary issue = requireIssue(journalId, issueId);
        if (IssueStatus.isPublished(issue.status())) {
            throw ApiException.conflict("already_published", "This issue is already published.");
        }
        int updated = journals.publishIssue(journalId, issueId);
        if (updated == 0) {
            throw ApiException.conflict("already_published", "This issue is already published.");
        }
        return requireIssue(journalId, issueId);
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummary> listArticles(
            String journalId,
            String query,
            Integer year,
            Integer volume,
            Integer issue,
            String articleType,
            String sort,
            int page,
            int size) {
        requireJournal(journalId);
        ArticleSearchQuery search = new ArticleSearchQuery(
                query,
                journalId,
                null,
                year,
                volume,
                issue,
                articleType,
                null,
                null,
                normalizeSort(sort),
                normalizePage(page),
                normalizeSize(size, 10, 50));
        return articles.search(search);
    }

    @Transactional(readOnly = true)
    public JournalArticleFilterOptions articleFilters(String journalId) {
        requireJournal(journalId);
        return articles.journalFilterOptions(journalId);
    }

    @Transactional(readOnly = true)
    public JournalArticleDetail getArticle(String journalId, long articleId) {
        JournalRepository.ArticleRow row = journals.findActiveArticle(journalId, articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        assertArticleIssueVisible(journalId, row.issueId());
        return journals.toDetail(row);
    }

    @Transactional(readOnly = true)
    public ResponseEntity<InputStreamResource> cover(String journalId) {
        JournalRepository.JournalRow row = requireJournal(journalId);
        if (row.coverStorageKey() == null) {
            throw ApiException.notFound("not_found", "Journal cover was not found.");
        }
        InputStream stream = objectStorage.get(row.coverStorageKey());
        long size = objectStorage.size(row.coverStorageKey());
        MediaType mediaType = MediaType.parseMediaType(
                row.coverContentType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : row.coverContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(size)
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(new InputStreamResource(stream));
    }

    @Transactional
    public JournalDetail createJournal(
            String name,
            String slug,
            String discipline,
            String description,
            String issnOnline,
            String publisher,
            Integer foundedYear,
            String frequency,
            String aimsAndScope,
            String editorInChief,
            MultipartFile cover) {
        FileMagic.requireCover(cover);
        String resolvedName = TextSupport.requireText(name, "Journal name is required.");
        String id = uniqueSlug(slug == null || slug.isBlank() ? TextSupport.slugify(resolvedName) : TextSupport.slugify(slug));
        Instant now = Instant.now();
        String key = "covers/" + id + "/" + UUID.randomUUID() + "." + FileMagic.imageExtension(cover.getContentType());
        try (InputStream in = cover.getInputStream()) {
            objectStorage.put(key, in, cover.getSize(), cover.getContentType());
        } catch (IOException ex) {
            throw ApiException.storage("Unable to store the cover image.");
        }
        try {
            journals.insertJournal(new JournalRepository.JournalRow(
                    id,
                    resolvedName,
                    TextSupport.requireText(discipline, "Discipline is required."),
                    TextSupport.requireText(description, "Description is required."),
                    TextSupport.requireText(issnOnline, "ISSN is required."),
                    TextSupport.requireText(publisher, "Publisher is required."),
                    foundedYear == null ? LocalDate.now().getYear() : foundedYear,
                    TextSupport.requireText(frequency, "Frequency is required."),
                    TextSupport.requireText(aimsAndScope, "Aims and scope are required."),
                    TextSupport.requireText(editorInChief, "Editor-in-chief is required."),
                    key,
                    cover.getContentType(),
                    now));
        } catch (RuntimeException ex) {
            objectStorage.delete(key);
            throw ex;
        }
        return get(id);
    }

    @Transactional
    public IssueSummary createIssue(String journalId, Integer volume, Integer issue, String publishedAt, String description) {
        requireJournal(journalId);
        if (volume == null || volume < 1) {
            throw ApiException.validation("Volume is required.");
        }
        if (issue == null || issue < 1) {
            throw ApiException.validation("Issue number is required.");
        }
        LocalDate date;
        try {
            date = LocalDate.parse(TextSupport.requireText(publishedAt, "Published date is required."));
        } catch (Exception ex) {
            throw ApiException.validation("Published date must be an ISO date.");
        }
        if (journals.issueDuplicate(journalId, volume, issue)) {
            throw ApiException.conflict("duplicate_issue", "This volume and issue already exist.");
        }
        return journals.insertIssue(
                journalId, volume, issue, date, TextSupport.requireText(description, "Description is required."));
    }

    public IssueSummary requireIssue(String journalId, long issueId) {
        requireJournal(journalId);
        return journals.findIssue(journalId, issueId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Issue was not found."));
    }

    public void assertArticleIssueVisible(String journalId, long issueId) {
        IssueSummary issue = requireIssue(journalId, issueId);
        if (!IssueStatus.isPublished(issue.status()) && !AuthService.isCurrentAdmin()) {
            throw ApiException.notFound("not_found", "Article was not found.");
        }
    }

    @Transactional
    public void deleteJournal(String journalId) {
        requireJournal(journalId);
        journals.deleteJournal(journalId);
    }

    @Transactional
    public void deleteArticle(String journalId, long articleId) {
        requireJournal(journalId);
        journals.findActiveArticle(journalId, articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        journals.softDeleteArticle(journalId, articleId);
    }

    public JournalRepository.JournalRow requireJournal(String journalId) {
        return journals.findActive(journalId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Journal was not found."));
    }

    private IssueSummary requirePublishedIssue(String journalId, long issueId) {
        IssueSummary issue = requireIssue(journalId, issueId);
        if (!IssueStatus.isPublished(issue.status())) {
            throw ApiException.notFound("not_found", "Issue was not found.");
        }
        return issue;
    }

    private IssueDetail toIssueDetail(IssueSummary issue) {
        return new IssueDetail(
                issue.id(),
                issue.journalId(),
                issue.volume(),
                issue.issue(),
                issue.publishedAt(),
                issue.description(),
                issue.status(),
                journals.listIssueArticles(issue.id()));
    }

    private String uniqueSlug(String base) {
        String candidate = base;
        int suffix = 2;
        while (journals.slugExists(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
            if (candidate.length() > 80) {
                candidate = candidate.substring(0, 80);
            }
        }
        return candidate;
    }

    static public String normalizeSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "newest";
        }
        return switch (sort) {
            case "relevance", "newest", "citations", "title" -> sort;
            default -> "newest";
        };
    }

    static public int normalizePage(int page) {
        return Math.max(page, 0);
    }

    static public int normalizeSize(int size, int fallback, int max) {
        if (size < 1) {
            return fallback;
        }
        return Math.min(size, max);
    }
}
