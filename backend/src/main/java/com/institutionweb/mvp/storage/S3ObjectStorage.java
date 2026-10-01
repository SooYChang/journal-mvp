package com.institutionweb.mvp.storage;

import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.config.AppProperties;
import java.io.InputStream;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

public class S3ObjectStorage implements ObjectStorage {
    private final S3Client client;
    private final String bucket;

    public S3ObjectStorage(AppProperties.S3 properties) {
        this.bucket = properties.bucket();
        this.client = S3Client.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.accessKeyId(), properties.secretAccessKey())))
                .build();
    }

    @Override
    public void put(String key, InputStream content, long contentLength, String contentType) {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build();
            client.putObject(request, RequestBody.fromInputStream(content, contentLength));
        } catch (S3Exception ex) {
            throw ApiException.storage("Unable to store the uploaded file.");
        }
    }

    @Override
    public InputStream get(String key) {
        try {
            return client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (NoSuchKeyException ex) {
            throw ApiException.notFound("not_found", "The requested file was not found.");
        } catch (S3Exception ex) {
            throw ApiException.storage("Unable to read the stored file.");
        }
    }

    @Override
    public long size(String key) {
        try {
            return client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build()).contentLength();
        } catch (NoSuchKeyException ex) {
            throw ApiException.notFound("not_found", "The requested file was not found.");
        } catch (S3Exception ex) {
            throw ApiException.storage("Unable to read the stored file.");
        }
    }

    @Override
    public void delete(String key) {
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (S3Exception ex) {
            throw ApiException.storage("Unable to delete the stored file.");
        }
    }

    @Override
    public boolean exists(String key) {
        try {
            client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException ex) {
            return false;
        } catch (S3Exception ex) {
            throw ApiException.storage("Unable to inspect the stored file.");
        }
    }
}
