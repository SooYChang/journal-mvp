package com.institutionweb.mvp.article;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.institutionweb.mvp.article.ArticleQueryRepository.ArticleSearchQuery;
import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.common.api.PageResponse;
import com.institutionweb.mvp.common.util.TextSupport;
import com.institutionweb.mvp.journal.JournalRepository;
import com.institutionweb.mvp.journal.JournalService;
import com.institutionweb.mvp.storage.FileMagic;
import com.institutionweb.mvp.storage.ObjectStorage;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
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
public class ArticleService {
    private final JournalRepository journals;
    private final JournalService journalService;
    private final ArticleQueryRepository queries;
    private final ObjectStorage objectStorage;
    private final ObjectMapper objectMapper;

    public ArticleService(
            JournalRepository journals,
            JournalService journalService,
            ArticleQueryRepository queries,
            ObjectStorage objectStorage,
            ObjectMapper objectMapper) {
        this.journals = journals;
        this.journalService = journalService;
        this.queries = queries;
        this.objectStorage = objectStorage;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummary> searchGlobal(
            String query,
            String journalId,
            String discipline,
            Integer year,
            String articleType,
            Boolean openAccess,
            Boolean hasPdf,
            String sort,
            int page,
            int size) {
        return queries.search(new ArticleSearchQuery(
                query,
                journalId,
                discipline,
                year,
                null,
                null,
                articleType,
                openAccess,
                hasPdf,
                JournalService.normalizeSort(sort),
                JournalService.normalizePage(page),
                JournalService.normalizeSize(size, 10, 50)));
    }

    @Transactional(readOnly = true)
    public GlobalArticleFilterOptions globalFilters() {
        return queries.globalFilterOptions();
    }

    @Transactional(readOnly = true)
    public JournalArticleDetail getGlobal(long articleId) {
        JournalRepository.ArticleRow row = journals.findActiveArticleById(articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        journalService.assertArticleIssueVisible(row.journalId(), row.issueId());
        return journals.toDetail(row);
    }

    @Transactional
    public JournalArticleDetail upload(
            String journalId,
            Long issueId,
            String title,
            List<String> authors,
            String abstractText,
            List<String> keywords,
            String pages,
            String doi,
            String articleType,
            String publishedAt,
            Integer citations,
            Boolean openAccess,
            MultipartFile pdf) {
        journalService.requireJournal(journalId);
        if (issueId == null) {
            throw ApiException.validation("Issue is required.");
        }
        journals.findIssue(journalId, issueId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Issue was not found."));
        FileMagic.requirePdf(pdf);
        String resolvedTitle = TextSupport.requireText(title, "Title is required.");
        List<String> resolvedAuthors = requireList(authors, "At least one author is required.");
        String resolvedAbstract = TextSupport.requireText(abstractText, "Abstract is required.");
        List<String> resolvedKeywords = keywords == null ? List.of() : keywords.stream()
                .map(TextSupport::trimToNull)
                .filter(v -> v != null)
                .toList();
        String resolvedType = TextSupport.requireText(articleType, "Article type is required.");
        LocalDate published;
        try {
            published = LocalDate.parse(TextSupport.requireText(publishedAt, "Published date is required."));
        } catch (Exception ex) {
            throw ApiException.validation("Published date must be an ISO date.");
        }
        String resolvedDoi = normalizeDoi(doi);
        if (journals.doiExists(resolvedDoi)) {
            throw ApiException.conflict("duplicate_doi", "This DOI is already registered.");
        }
        Instant now = Instant.now();
        String originalName = TextSupport.safeOriginalFilename(pdf.getOriginalFilename());
        String tempKey = "pdfs/tmp/" + UUID.randomUUID() + ".pdf";
        try (InputStream in = pdf.getInputStream()) {
            objectStorage.put(tempKey, in, pdf.getSize(), "application/pdf");
        } catch (IOException ex) {
            throw ApiException.storage("Unable to store the PDF file.");
        }
        long articleId = -1;
        String finalKey = null;
        try {
            articleId = journals.insertArticle(new JournalRepository.ArticleInsert(
                    issueId,
                    resolvedTitle,
                    JsonLists.write(objectMapper, resolvedAuthors),
                    resolvedAbstract,
                    JsonLists.write(objectMapper, resolvedKeywords),
                    TextSupport.trimToNull(pages),
                    TextSupport.pageStart(pages),
                    resolvedDoi,
                    resolvedType,
                    published,
                    citations == null ? 0 : Math.max(citations, 0),
                    openAccess == null || openAccess,
                    tempKey,
                    originalName,
                    "application/pdf",
                    pdf.getSize(),
                    now,
                    now));
            finalKey = "pdfs/" + articleId + "/" + UUID.randomUUID() + ".pdf";
            try (InputStream stored = objectStorage.get(tempKey)) {
                objectStorage.put(finalKey, stored, pdf.getSize(), "application/pdf");
            }
            journals.updatePdfKey(articleId, finalKey);
            objectStorage.delete(tempKey);
        } catch (RuntimeException | IOException ex) {
            if (articleId > 0) {
                journals.deleteArticleRow(articleId);
            }
            objectStorage.delete(tempKey);
            if (finalKey != null) {
                try {
                    objectStorage.delete(finalKey);
                } catch (RuntimeException ignored) {
                    // ignore secondary cleanup
                }
            }
            if (ex instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw ApiException.storage("Unable to store the PDF file.");
        }
        return journals.findActiveArticle(journalId, articleId)
                .map(journals::toDetail)
                .orElseThrow(() -> ApiException.storage("The article was stored but could not be reloaded."));
    }

    @Transactional
    public JournalArticleDetail update(
            String journalId,
            long articleId,
            Long issueId,
            String title,
            List<String> authors,
            String abstractText,
            List<String> keywords,
            String pages,
            String doi,
            String articleType,
            String publishedAt,
            Integer citations,
            Boolean openAccess,
            MultipartFile pdf) {
        journalService.requireJournal(journalId);
        JournalRepository.ArticleRow existing = journals.findActiveArticle(journalId, articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        if (issueId == null) {
            throw ApiException.validation("Issue is required.");
        }
        journals.findIssue(journalId, issueId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Issue was not found."));
        String resolvedTitle = TextSupport.requireText(title, "Title is required.");
        List<String> resolvedAuthors = requireList(authors, "At least one author is required.");
        String resolvedAbstract = TextSupport.requireText(abstractText, "Abstract is required.");
        List<String> resolvedKeywords = keywords == null ? List.of() : keywords.stream()
                .map(TextSupport::trimToNull)
                .filter(v -> v != null)
                .toList();
        String resolvedType = TextSupport.requireText(articleType, "Article type is required.");
        LocalDate published;
        try {
            published = LocalDate.parse(TextSupport.requireText(publishedAt, "Published date is required."));
        } catch (Exception ex) {
            throw ApiException.validation("Published date must be an ISO date.");
        }
        String resolvedDoi = normalizeDoi(doi);
        if (journals.doiExistsForOther(resolvedDoi, articleId)) {
            throw ApiException.conflict("duplicate_doi", "This DOI is already registered.");
        }
        journals.updateArticle(new JournalRepository.ArticleUpdate(
                articleId,
                issueId,
                resolvedTitle,
                JsonLists.write(objectMapper, resolvedAuthors),
                resolvedAbstract,
                JsonLists.write(objectMapper, resolvedKeywords),
                TextSupport.trimToNull(pages),
                TextSupport.pageStart(pages),
                resolvedDoi,
                resolvedType,
                published,
                citations == null ? existing.citations() : Math.max(citations, 0),
                openAccess == null ? existing.openAccess() : openAccess));
        if (pdf != null && !pdf.isEmpty()) {
            replacePdf(existing, pdf);
        }
        return journals.findActiveArticle(journalId, articleId)
                .map(journals::toDetail)
                .orElseThrow(() -> ApiException.storage("The article was updated but could not be reloaded."));
    }

    private void replacePdf(JournalRepository.ArticleRow existing, MultipartFile pdf) {
        FileMagic.requirePdf(pdf);
        String newKey = "pdfs/" + existing.id() + "/" + UUID.randomUUID() + ".pdf";
        try (InputStream in = pdf.getInputStream()) {
            objectStorage.put(newKey, in, pdf.getSize(), "application/pdf");
        } catch (IOException ex) {
            throw ApiException.storage("Unable to store the PDF file.");
        }
        try {
            journals.replacePdf(
                    existing.id(),
                    newKey,
                    TextSupport.safeOriginalFilename(pdf.getOriginalFilename()),
                    "application/pdf",
                    pdf.getSize(),
                    Instant.now());
        } catch (RuntimeException ex) {
            try {
                objectStorage.delete(newKey);
            } catch (RuntimeException ignored) {
                // The database change is rolled back with the thrown exception.
            }
            throw ex;
        }
        if (existing.pdfStorageKey() != null && !existing.pdfStorageKey().equals(newKey)) {
            try {
                objectStorage.delete(existing.pdfStorageKey());
            } catch (RuntimeException ignored) {
                // The new PDF is already saved. A leftover old file can be removed later.
            }
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<InputStreamResource> pdf(String journalId, long articleId, boolean download) {
        JournalRepository.ArticleRow article = journals.findActiveArticle(journalId, articleId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Article was not found."));
        journalService.assertArticleIssueVisible(journalId, article.issueId());
        if (article.pdfStorageKey() == null) {
            throw ApiException.notFound("pdf_not_found", "PDF has not been uploaded yet.");
        }
        InputStream stream = objectStorage.get(article.pdfStorageKey());
        long size = objectStorage.size(article.pdfStorageKey());
        String filename = article.pdfOriginalFilename() == null ? "article.pdf" : article.pdfOriginalFilename();
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(filename, StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentLength(size)
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(new InputStreamResource(stream));
    }

    public static List<String> parseList(ObjectMapper mapper, String raw, String repeatedFallback) {
        List<String> values = new ArrayList<>();
        if (raw != null && !raw.isBlank()) {
            String trimmed = raw.trim();
            if (trimmed.startsWith("[")) {
                try {
                    values.addAll(mapper.readValue(trimmed, new TypeReference<List<String>>() {}));
                } catch (Exception ex) {
                    throw ApiException.validation("List values are invalid.");
                }
            } else {
                for (String part : trimmed.split(",")) {
                    String item = TextSupport.trimToNull(part);
                    if (item != null) {
                        values.add(item);
                    }
                }
            }
        }
        return values;
    }

    private List<String> requireList(List<String> values, String message) {
        List<String> cleaned = values == null
                ? List.of()
                : values.stream().map(TextSupport::trimToNull).filter(v -> v != null).toList();
        if (cleaned.isEmpty()) {
            throw ApiException.validation(message);
        }
        return cleaned;
    }

    private static String normalizeDoi(String doi) {
        String value = TextSupport.trimToNull(doi);
        if (value == null) {
            return null;
        }
        value = value.replaceFirst("(?i)^https?://(?:dx\\.)?doi\\.org/", "");
        value = value.replaceFirst("(?i)^doi:\\s*", "");
        return value;
    }
}
