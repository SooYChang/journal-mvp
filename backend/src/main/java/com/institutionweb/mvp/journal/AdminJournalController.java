package com.institutionweb.mvp.journal;

import com.institutionweb.mvp.article.ArticleService;
import com.institutionweb.mvp.article.JournalArticleDetail;
import com.institutionweb.mvp.article.JsonLists;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AdminJournalController {
    private final JournalService journals;
    private final ArticleService articles;
    private final ObjectMapper objectMapper;

    public AdminJournalController(JournalService journals, ArticleService articles, ObjectMapper objectMapper) {
        this.journals = journals;
        this.articles = articles;
        this.objectMapper = objectMapper;
    }

    @PostMapping(path = "/api/admin/journals", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JournalDetail create(
            @RequestParam String name,
            @RequestParam(required = false) String slug,
            @RequestParam String discipline,
            @RequestParam String description,
            @RequestParam String issnOnline,
            @RequestParam String publisher,
            @RequestParam(required = false) Integer foundedYear,
            @RequestParam String frequency,
            @RequestParam String aimsAndScope,
            @RequestParam String editorInChief,
            @RequestPart("cover") MultipartFile cover) {
        return journals.createJournal(
                name,
                slug,
                discipline,
                description,
                issnOnline,
                publisher,
                foundedYear,
                frequency,
                aimsAndScope,
                editorInChief,
                cover);
    }

    @PostMapping("/api/admin/journals/{journalId}/issues")
    public IssueSummary createIssue(
            @PathVariable String journalId,
            @org.springframework.web.bind.annotation.RequestBody IssueCreateRequest request) {
        return journals.createIssue(journalId, request.volume(), request.issue(), request.publishedAt(), request.description());
    }

    @GetMapping("/api/admin/journals/{journalId}/issues/{issueId}")
    public IssueDetail getIssue(@PathVariable String journalId, @PathVariable long issueId) {
        return journals.getIssueForAdmin(journalId, issueId);
    }

    @PostMapping("/api/admin/journals/{journalId}/issues/{issueId}/publish")
    public IssueSummary publishIssue(@PathVariable String journalId, @PathVariable long issueId) {
        return journals.publishIssue(journalId, issueId);
    }

    @DeleteMapping("/api/admin/journals/{journalId}")
    public Map<String, String> deleteJournal(@PathVariable String journalId) {
        journals.deleteJournal(journalId);
        return Map.of("status", "ok");
    }

    @DeleteMapping("/api/admin/journals/{journalId}/articles/{articleId}")
    public Map<String, String> deleteArticle(@PathVariable String journalId, @PathVariable long articleId) {
        journals.deleteArticle(journalId, articleId);
        return Map.of("status", "ok");
    }

    @PostMapping(path = "/api/admin/journals/{journalId}/articles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public JournalArticleDetail upload(
            @PathVariable String journalId,
            @RequestParam Long issueId,
            @RequestParam String title,
            @RequestParam(required = false) String authors,
            @RequestParam(required = false) List<String> authorsList,
            @RequestParam String abstractText,
            @RequestParam(required = false) String keywords,
            @RequestParam(required = false) String pages,
            @RequestParam(required = false) String doi,
            @RequestParam String articleType,
            @RequestParam String publishedAt,
            @RequestParam(required = false) Integer citations,
            @RequestParam(required = false) Boolean openAccess,
            @RequestPart("pdf") MultipartFile pdf) {
        List<String> resolvedAuthors = new ArrayList<>();
        if (authorsList != null) {
            resolvedAuthors.addAll(authorsList);
        }
        resolvedAuthors.addAll(ArticleService.parseList(objectMapper, authors, null));
        List<String> resolvedKeywords = ArticleService.parseList(objectMapper, keywords, null);
        return articles.upload(
                journalId,
                issueId,
                title,
                resolvedAuthors,
                abstractText,
                resolvedKeywords,
                pages,
                doi,
                articleType,
                publishedAt,
                citations,
                openAccess,
                pdf);
    }

    public record IssueCreateRequest(Integer volume, Integer issue, String publishedAt, String description) {}
}
