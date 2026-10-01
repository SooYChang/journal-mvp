package com.institutionweb.mvp.storage;

import com.institutionweb.mvp.common.api.ApiException;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import org.springframework.web.multipart.MultipartFile;

public final class FileMagic {
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private FileMagic() {}

    public static void requireCover(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.validation("A journal cover image is required.");
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            throw ApiException.validation("Cover images must be 5MB or smaller.");
        }
        String contentType = normalizeType(file.getContentType());
        if (!IMAGE_TYPES.contains(contentType)) {
            throw ApiException.validation("Cover images must be JPEG, PNG, or WebP.");
        }
        byte[] header = readHeader(file, 12);
        if ("image/jpeg".equals(contentType) && !isJpeg(header)) {
            throw ApiException.validation("The cover file is not a valid JPEG image.");
        }
        if ("image/png".equals(contentType) && !isPng(header)) {
            throw ApiException.validation("The cover file is not a valid PNG image.");
        }
        if ("image/webp".equals(contentType) && !isWebp(header)) {
            throw ApiException.validation("The cover file is not a valid WebP image.");
        }
    }

    public static void requirePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.validation("A PDF file is required.");
        }
        if (file.getSize() > 25L * 1024 * 1024) {
            throw ApiException.validation("PDF files must be 25MB or smaller.");
        }
        String contentType = normalizeType(file.getContentType());
        if (!"application/pdf".equals(contentType)) {
            throw ApiException.validation("The file must be a PDF.");
        }
        byte[] header = readHeader(file, 5);
        if (header.length < 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
            throw ApiException.validation("The file is not a valid PDF.");
        }
    }

    public static String imageExtension(String contentType) {
        return switch (normalizeType(contentType)) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "bin";
        };
    }

    private static String normalizeType(String contentType) {
        if (contentType == null) {
            return "";
        }
        int cut = contentType.indexOf(';');
        String raw = cut >= 0 ? contentType.substring(0, cut) : contentType;
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    private static byte[] readHeader(MultipartFile file, int length) {
        try (var in = file.getInputStream()) {
            return in.readNBytes(length);
        } catch (IOException ex) {
            throw ApiException.validation("The uploaded file could not be read.");
        }
    }

    private static boolean isJpeg(byte[] header) {
        return header.length >= 3 && (header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] header) {
        return header.length >= 8
                && (header[0] & 0xFF) == 0x89
                && header[1] == 0x50
                && header[2] == 0x4E
                && header[3] == 0x47;
    }

    private static boolean isWebp(byte[] header) {
        return header.length >= 12
                && header[0] == 'R'
                && header[1] == 'I'
                && header[2] == 'F'
                && header[3] == 'F'
                && header[8] == 'W'
                && header[9] == 'E'
                && header[10] == 'B'
                && header[11] == 'P';
    }
}
