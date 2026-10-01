package com.institutionweb.mvp.auth;

import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.user.UserRecord;
import com.institutionweb.mvp.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final SessionUserDetailsService userDetailsService;

    public AuthService(
            UserRepository users, PasswordEncoder passwordEncoder, SessionUserDetailsService userDetailsService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    @Transactional(readOnly = true)
    public UserDto login(LoginRequest request, HttpServletRequest httpRequest) {
        UserRecord user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("invalid_credentials", "Invalid email or password."));
        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw ApiException.unauthorized("invalid_credentials", "Invalid email or password.");
        }
        if (user.isDeleted()) {
            throw ApiException.unauthorized("account_deleted", "This account has been deleted.");
        }
        if (!"ACTIVE".equals(user.status())) {
            throw ApiException.unauthorized("account_inactive", "This account is not active.");
        }
        SessionUser principal = new SessionUser(user);
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        HttpSession old = httpRequest.getSession(false);
        if (old != null) {
            old.invalidate();
        }
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        return principal.toDto();
    }

    @Transactional(readOnly = true)
    public UserDto me() {
        SessionUser current = currentUser();
        return userDetailsService.requireCurrent(current.id()).toDto();
    }

    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    public static SessionUser currentUserOrNull() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SessionUser user)) {
            return null;
        }
        return user;
    }

    public static SessionUser currentUser() {
        SessionUser user = currentUserOrNull();
        if (user == null) {
            throw ApiException.unauthorized("authentication_required", "Authentication is required.");
        }
        return user;
    }

    public static boolean isCurrentAdmin() {
        SessionUser user = currentUserOrNull();
        return user != null && user.isAdmin();
    }

    public static SessionUser currentAdmin() {
        SessionUser user = currentUser();
        if (!user.isAdmin()) {
            throw ApiException.forbidden("Administrator access is required.");
        }
        return user;
    }
}
