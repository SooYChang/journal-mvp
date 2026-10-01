package com.institutionweb.mvp.user;

import java.time.Instant;

public record UserRecord(
        long id,
        String email,
        String displayName,
        String passwordHash,
        String role,
        String status,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt) {

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isActive() {
        return "ACTIVE".equals(status) && !isDeleted();
    }

    public boolean isAdmin() {
        return "SOCIETY_ADMIN".equals(role);
    }
}
