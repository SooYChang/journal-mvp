package com.institutionweb.mvp.storage;

import com.institutionweb.mvp.common.api.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public class LocalObjectStorage implements ObjectStorage {
    private final Path root;

    public LocalObjectStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root.resolve("covers"));
            Files.createDirectories(this.root.resolve("pdfs"));
        } catch (IOException ex) {
            throw ApiException.storage("Unable to prepare the local upload directory.");
        }
    }

    @Override
    public void put(String key, InputStream content, long contentLength, String contentType) {
        Path target = resolveKey(key);
        Path temp = null;
        try {
            Files.createDirectories(target.getParent());
            temp = Files.createTempFile(target.getParent(), "tmp-", ".part");
            Files.copy(content, temp, StandardCopyOption.REPLACE_EXISTING);
            try {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException ex) {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            if (temp != null) {
                try {
                    Files.deleteIfExists(temp);
                } catch (IOException ignored) {
                    // ignore cleanup failure
                }
            }
            throw ApiException.storage("Unable to store the uploaded file.");
        }
    }

    @Override
    public InputStream get(String key) {
        try {
            return Files.newInputStream(resolveExisting(key));
        } catch (IOException ex) {
            throw ApiException.notFound("not_found", "The requested file was not found.");
        }
    }

    @Override
    public long size(String key) {
        try {
            return Files.size(resolveExisting(key));
        } catch (IOException ex) {
            throw ApiException.notFound("not_found", "The requested file was not found.");
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolveKey(key));
        } catch (IOException ex) {
            throw ApiException.storage("Unable to delete the stored file.");
        }
    }

    @Override
    public boolean exists(String key) {
        Path path = resolveKey(key);
        return Files.exists(path) && Files.isRegularFile(path);
    }

    private Path resolveExisting(String key) {
        Path path = resolveKey(key);
        if (!Files.exists(path) || !Files.isRegularFile(path)) {
            throw ApiException.notFound("not_found", "The requested file was not found.");
        }
        return path;
    }

    private Path resolveKey(String key) {
        if (key == null || key.isBlank() || key.contains("\\") || key.startsWith("/") || key.contains("..")) {
            throw ApiException.validation("Invalid storage key.");
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw ApiException.validation("Invalid storage key.");
        }
        return resolved;
    }
}
