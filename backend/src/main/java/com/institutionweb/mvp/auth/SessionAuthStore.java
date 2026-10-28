package com.institutionweb.mvp.auth;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class SessionAuthStore {
    private final ConcurrentHashMap<String, Long> sessions = new ConcurrentHashMap<>();

    public void put(String sessionId, long userId) {
        if (sessionId != null && !sessionId.isBlank()) {
            sessions.put(sessionId, userId);
        }
    }

    public Long find(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        return sessions.get(sessionId.trim());
    }

    public void remove(String sessionId) {
        if (sessionId != null) {
            sessions.remove(sessionId);
        }
    }
}
