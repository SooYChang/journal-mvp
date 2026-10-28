package com.institutionweb.mvp.auth;

public record AuthUserResponse(UserDto user, String sessionId) {
    public AuthUserResponse(UserDto user) {
        this(user, null);
    }
}
