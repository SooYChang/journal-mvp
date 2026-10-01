package com.institutionweb.mvp.member;

import com.institutionweb.mvp.auth.AuthService;
import com.institutionweb.mvp.auth.SessionUser;
import com.institutionweb.mvp.auth.UserDto;
import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.common.api.PageResponse;
import com.institutionweb.mvp.common.util.TextSupport;
import com.institutionweb.mvp.user.UserRecord;
import com.institutionweb.mvp.user.UserRepository;
import java.time.Instant;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {
    private static final Set<String> ROLES = Set.of("MEMBER", "SOCIETY_ADMIN");
    private static final Set<String> STATUSES = Set.of("ACTIVE", "SUSPENDED", "DEACTIVATED");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{10,}$");

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public MemberService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public PageResponse<MemberDto> list(String query, String status, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = size < 1 ? 20 : Math.min(size, 50);
        String normalizedStatus = TextSupport.trimToNull(status);
        if (normalizedStatus != null && !STATUSES.contains(normalizedStatus)) {
            throw ApiException.validation("Status is invalid.");
        }
        long total = users.countMembers(query, normalizedStatus);
        return PageResponse.of(
                users.listMembers(query, normalizedStatus, safePage, safeSize).stream()
                        .map(this::toDto)
                        .toList(),
                safePage,
                safeSize,
                total);
    }

    @Transactional
    public MemberDto create(CreateMemberRequest request) {
        String email = TextSupport.requireText(request.email(), "Email is required.").toLowerCase();
        if (!EMAIL.matcher(email).matches()) {
            throw ApiException.validation("Email is invalid.");
        }
        String displayName = TextSupport.requireText(request.displayName(), "Display name is required.");
        if (displayName.length() > 120) {
            throw ApiException.validation("Display name must be 120 characters or fewer.");
        }
        String password = TextSupport.requireText(request.temporaryPassword(), "Temporary password is required.");
        if (!PASSWORD.matcher(password).matches()) {
            throw ApiException.validation(
                    "Password must be at least 10 characters and include a letter, a number, and a symbol.");
        }
        String role = request.role() == null ? "MEMBER" : request.role();
        if (!ROLES.contains(role)) {
            throw ApiException.validation("Role is invalid.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("duplicate_email", "A member with this email already exists.");
        }
        Instant now = Instant.now();
        return toDto(users.insert(email, displayName, passwordEncoder.encode(password), role, "ACTIVE", now));
    }

    @Transactional(readOnly = true)
    public MemberDto get(long userId) {
        UserRecord user = users.findById(userId)
                .filter(item -> !item.isDeleted())
                .orElseThrow(() -> ApiException.notFound("not_found", "Member was not found."));
        return toDto(user);
    }

    @Transactional
    public MemberDto update(long userId, PatchMemberRequest request) {
        SessionUser actor = AuthService.currentAdmin();
        UserRecord existing = users.findById(userId)
                .filter(item -> !item.isDeleted())
                .orElseThrow(() -> ApiException.notFound("not_found", "Member was not found."));
        String displayName = request.displayName() == null
                ? existing.displayName()
                : TextSupport.requireText(request.displayName(), "Display name is required.");
        if (displayName.length() > 120) {
            throw ApiException.validation("Display name must be 120 characters or fewer.");
        }
        String role = request.role() == null ? existing.role() : request.role();
        String status = request.status() == null ? existing.status() : request.status();
        if (!ROLES.contains(role)) {
            throw ApiException.validation("Role is invalid.");
        }
        if (!STATUSES.contains(status)) {
            throw ApiException.validation("Status is invalid.");
        }
        boolean demotingLastAdmin = existing.isAdmin()
                && existing.isActive()
                && (!"SOCIETY_ADMIN".equals(role) || !"ACTIVE".equals(status))
                && users.countActiveAdmins() <= 1;
        if (demotingLastAdmin) {
            throw ApiException.forbidden("The last active administrator cannot be changed.");
        }
        if (actor.id() == userId && (!"SOCIETY_ADMIN".equals(role) || !"ACTIVE".equals(status))) {
            if (users.countActiveAdmins() <= 1) {
                throw ApiException.forbidden("The last active administrator cannot be changed.");
            }
        }
        return toDto(users.update(userId, displayName, role, status, Instant.now()));
    }

    @Transactional
    public void delete(long userId) {
        SessionUser actor = AuthService.currentAdmin();
        UserRecord existing = users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("not_found", "Member was not found."));
        if (existing.isDeleted()) {
            throw ApiException.notFound("not_found", "Member was not found.");
        }
        if (actor.id() == userId) {
            throw ApiException.forbidden("You cannot delete your own account.");
        }
        if (existing.isAdmin() && existing.isActive() && users.countActiveAdmins() <= 1) {
            throw ApiException.forbidden("The last active administrator cannot be deleted.");
        }
        users.softDelete(userId, Instant.now());
    }

    private MemberDto toDto(UserRecord user) {
        return new MemberDto(
                user.id(),
                user.email(),
                user.displayName(),
                user.role(),
                user.status(),
                user.createdAt(),
                user.updatedAt());
    }

    public record CreateMemberRequest(String email, String displayName, String temporaryPassword, String role) {}

    public record PatchMemberRequest(String displayName, String role, String status) {}

    public record MemberDto(
            long id,
            String email,
            String displayName,
            String role,
            String status,
            Instant createdAt,
            Instant updatedAt) {}
}
