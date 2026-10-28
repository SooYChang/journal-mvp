package com.institutionweb.mvp.article;

import com.institutionweb.mvp.common.api.PageResponse;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArticleController {
    private final ArticleService articles;

    public ArticleController(ArticleService articles) {
        this.articles = articles;
    }

    @GetMapping("/api/articles")
    public PageResponse<ArticleSummary> search(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String journalId,
            @RequestParam(required = false) String discipline,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String articleType,
            @RequestParam(required = false) Boolean openAccess,
            @RequestParam(required = false) Boolean hasPdf,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return articles.searchGlobal(
                query, journalId, discipline, year, articleType, openAccess, hasPdf, sort, page, size);
    }

    @GetMapping("/api/articles/filter-options")
    public GlobalArticleFilterOptions filterOptions() {
        return articles.globalFilters();
    }

    @GetMapping("/api/articles/{articleId}")
    public JournalArticleDetail get(@PathVariable long articleId) {
        return articles.getGlobal(articleId);
    }

    @GetMapping("/api/journals/{journalId}/articles/{articleId}/pdf")
    public ResponseEntity<InputStreamResource> pdf(
            @PathVariable String journalId,
            @PathVariable long articleId,
            @RequestParam(defaultValue = "false") boolean download) {
        return articles.pdf(journalId, articleId, download);
    }
}
