package com.institutionweb.mvp.auth;

public record UserDto(long id, String email, String displayName, String role, String status) {}
