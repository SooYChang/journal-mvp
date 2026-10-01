package com.institutionweb.mvp.common.api;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String error;

    public ApiException(HttpStatus status, String error, String message) {
        super(message);
        this.status = status;
        this.error = error;
    }

    public HttpStatus status() {
        return status;
    }

    public String error() {
        return error;
    }

    public static ApiException validation(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation_error", message);
    }

    public static ApiException unauthorized(String error, String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, error, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "authorization_denied", message);
    }

    public static ApiException notFound(String error, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, error, message);
    }

    public static ApiException conflict(String error, String message) {
        return new ApiException(HttpStatus.CONFLICT, error, message);
    }

    public static ApiException storage(String message) {
        return new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "storage_error", message);
    }
}
