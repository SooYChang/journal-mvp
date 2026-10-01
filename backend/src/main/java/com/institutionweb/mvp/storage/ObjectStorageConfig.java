package com.institutionweb.mvp.storage;

import com.institutionweb.mvp.config.AppProperties;
import java.nio.file.Path;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObjectStorageConfig {

    @Bean
    public ObjectStorage objectStorage(AppProperties properties) {
        if (properties.s3().isConfigured()) {
            return new S3ObjectStorage(properties.s3());
        }
        Path root = Path.of(properties.uploadDir() == null || properties.uploadDir().isBlank()
                ? "./data/uploads"
                : properties.uploadDir());
        return new LocalObjectStorage(root);
    }
}
