package com.institutionweb.mvp.journal;

import com.institutionweb.mvp.article.ArticleSummary;
import com.institutionweb.mvp.article.JournalArticleDetail;
import com.institutionweb.mvp.article.JournalArticleFilterOptions;
import com.institutionweb.mvp.common.api.PageResponse;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/journals")
public class JournalController {
    private final JournalService journals;

    public JournalController(JournalService journals) {
        this.journals = journals;
    }

    @GetMapping
    public List<JournalSummary> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String discipline,
            @RequestParam(required = false, defaultValue = "name") String sort,
            @RequestParam(required = false) Integer size) {
        return journals.list(query, discipline, sort, size);
    }

    @GetMapping("/disciplines")
    public List<String> disciplines() {
        return journals.disciplines();
    }

    @GetMapping("/{journalId}")
    public JournalDetail get(@PathVariable String journalId) {
        return journals.get(journalId);
    }

    @GetMapping("/{journalId}/cover")
    public ResponseEntity<InputStreamResource> cover(@PathVariable String journalId) {
        return journals.cover(journalId);
    }

    @GetMapping("/{journalId}/issues/{issueId}")
    public IssueDetail issue(@PathVariable String journalId, @PathVariable long issueId) {
        return journals.getIssue(journalId, issueId);
    }

    @GetMapping("/{journalId}/articles")
    public PageResponse<ArticleSummary> articles(
            @PathVariable String journalId,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer volume,
            @RequestParam(required = false) Integer issue,
            @RequestParam(required = false) String articleType,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return journals.listArticles(journalId, query, year, volume, issue, articleType, sort, page, size);
    }

    @GetMapping("/{journalId}/articles/filter-options")
    public JournalArticleFilterOptions filterOptions(@PathVariable String journalId) {
        return journals.articleFilters(journalId);
    }

    @GetMapping("/{journalId}/articles/{articleId}")
    public JournalArticleDetail article(@PathVariable String journalId, @PathVariable long articleId) {
        return journals.getArticle(journalId, articleId);
    }
}
