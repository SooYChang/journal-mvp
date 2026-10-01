package com.institutionweb.mvp.annotation;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnnotationController {
    private final AnnotationService annotations;

    public AnnotationController(AnnotationService annotations) {
        this.annotations = annotations;
    }

    @GetMapping("/api/journals/{journalId}/articles/{articleId}/annotations")
    public List<AnnotationDto> list(@PathVariable String journalId, @PathVariable long articleId) {
        return annotations.list(journalId, articleId);
    }

    @PostMapping("/api/journals/{journalId}/articles/{articleId}/annotations")
    public AnnotationDto create(
            @PathVariable String journalId,
            @PathVariable long articleId,
            @RequestBody AnnotationService.CreateRequest request) {
        return annotations.create(journalId, articleId, request);
    }

    @PatchMapping("/api/journals/{journalId}/articles/{articleId}/annotations/{annotationId}")
    public AnnotationDto patch(
            @PathVariable String journalId,
            @PathVariable long articleId,
            @PathVariable long annotationId,
            @RequestBody AnnotationService.PatchRequest request) {
        return annotations.patch(journalId, articleId, annotationId, request);
    }

    @DeleteMapping("/api/journals/{journalId}/articles/{articleId}/annotations/{annotationId}")
    public Map<String, String> delete(
            @PathVariable String journalId, @PathVariable long articleId, @PathVariable long annotationId) {
        annotations.delete(journalId, articleId, annotationId);
        return Map.of("status", "ok");
    }

    @PostMapping("/api/journals/{journalId}/articles/{articleId}/annotations/{annotationId}/replies")
    public AnnotationDto.ReplyDto reply(
            @PathVariable String journalId,
            @PathVariable long articleId,
            @PathVariable long annotationId,
            @RequestBody AnnotationService.ReplyRequest request) {
        return annotations.reply(journalId, articleId, annotationId, request);
    }
}
