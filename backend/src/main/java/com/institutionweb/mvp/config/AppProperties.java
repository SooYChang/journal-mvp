package com.institutionweb.mvp.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String uploadDir, S3 s3, Cors cors) {

    public record S3(String bucket, String region, String accessKeyId, String secretAccessKey) {
        public boolean isConfigured() {
            return hasText(bucket) && hasText(region) && hasText(accessKeyId) && hasText(secretAccessKey);
        }

        private static boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }

    public record Cors(String allowedOrigins) {
        public List<String> origins() {
            if (allowedOrigins == null || allowedOrigins.isBlank()) {
                return List.of();
            }
            return Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(part -> !part.isEmpty())
                    .toList();
        }
    }
}
