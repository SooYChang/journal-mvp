package com.institutionweb.mvp.storage;

import java.io.InputStream;

public interface ObjectStorage {
    void put(String key, InputStream content, long contentLength, String contentType);

    InputStream get(String key);

    long size(String key);

    void delete(String key);

    boolean exists(String key);
}
