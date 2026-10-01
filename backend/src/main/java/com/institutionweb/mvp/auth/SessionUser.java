package com.institutionweb.mvp.auth;

import com.institutionweb.mvp.user.UserRecord;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class SessionUser implements UserDetails {
    private final long id;
    private final String email;
    private final String displayName;
    private final String role;
    private final String status;
    private final String passwordHash;
    private final boolean deleted;

    public SessionUser(UserRecord user) {
        this.id = user.id();
        this.email = user.email();
        this.displayName = user.displayName();
        this.role = user.role();
        this.status = user.status();
        this.passwordHash = user.passwordHash();
        this.deleted = user.isDeleted();
    }

    public long id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }

    public String role() {
        return role;
    }

    public String status() {
        return status;
    }

    public UserDto toDto() {
        return new UserDto(id, email, displayName, role, status);
    }

    public boolean isAdmin() {
        return "SOCIETY_ADMIN".equals(role);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !deleted;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return "ACTIVE".equals(status) && !deleted;
    }
}
