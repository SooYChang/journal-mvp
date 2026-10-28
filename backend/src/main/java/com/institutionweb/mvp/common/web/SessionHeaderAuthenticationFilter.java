package com.institutionweb.mvp.common.web;

import com.institutionweb.mvp.auth.AuthService;
import com.institutionweb.mvp.auth.SessionAuthStore;
import com.institutionweb.mvp.auth.SessionUser;
import com.institutionweb.mvp.auth.SessionUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class SessionHeaderAuthenticationFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Auth-Session";

    private final SessionAuthStore store;
    private final SessionUserDetailsService userDetailsService;

    public SessionHeaderAuthenticationFilter(SessionAuthStore store, SessionUserDetailsService userDetailsService) {
        this.store = store;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (AuthService.currentUserOrNull() == null) {
            String sessionId = request.getHeader(HEADER);
            if (sessionId == null || sessionId.isBlank()) {
                String authorization = request.getHeader("Authorization");
                if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
                    sessionId = authorization.substring(7).trim();
                }
            }
            Long userId = store.find(sessionId);
            if (userId != null) {
                try {
                    SessionUser principal = userDetailsService.requireCurrent(userId);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    SecurityContext context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(authentication);
                    SecurityContextHolder.setContext(context);
                } catch (RuntimeException ex) {
                    store.remove(sessionId);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
