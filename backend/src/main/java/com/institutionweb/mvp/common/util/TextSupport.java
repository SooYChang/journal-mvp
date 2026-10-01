package com.institutionweb.mvp.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class TextSupport {
    private static final Pattern NON_SLUG = Pattern.compile("[^a-z0-9]+");
    private static final Pattern PAGE_START = Pattern.compile("(\\d+)");

    private TextSupport() {}

    public static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String requireText(String value, String message) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            throw com.institutionweb.mvp.common.api.ApiException.validation(message);
        }
        return trimmed;
    }

    public static String slugify(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        String slug = NON_SLUG.matcher(normalized).replaceAll("-");
        slug = slug.replaceAll("^-+", "").replaceAll("-+$", "");
        if (slug.length() > 80) {
            slug = slug.substring(0, 80).replaceAll("-+$", "");
        }
        return slug.isBlank() ? "journal" : slug;
    }

    public static Integer pageStart(String pages) {
        String trimmed = trimToNull(pages);
        if (trimmed == null) {
            return null;
        }
        Matcher matcher = PAGE_START.matcher(trimmed);
        if (!matcher.find()) {
            return null;
        }
        return Integer.parseInt(matcher.group(1));
    }

    public static String preview(String text, int maxChars) {
        if (text == null) {
            return "";
        }
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.length() <= maxChars) {
            return normalized;
        }
        return normalized.substring(0, maxChars);
    }

    public static String safeOriginalFilename(String original) {
        if (original == null || original.isBlank()) {
            return "upload.bin";
        }
        String name = java.nio.file.Path.of(original).getFileName().toString();
        name = name.replaceAll("[\\r\\n]", "");
        if (name.length() > 180) {
            String ext = "";
            int dot = name.lastIndexOf('.');
            if (dot > 0) {
                ext = name.substring(dot);
                name = name.substring(0, Math.min(dot, 180 - ext.length())) + ext;
            } else {
                name = name.substring(0, 180);
            }
        }
        return name.isBlank() ? "upload.bin" : name;
    }
}
