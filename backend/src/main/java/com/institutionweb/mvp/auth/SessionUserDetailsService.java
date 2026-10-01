package com.institutionweb.mvp.auth;

import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.user.UserRecord;
import com.institutionweb.mvp.user.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class SessionUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public SessionUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserRecord user = users.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found."));
        return new SessionUser(user);
    }

    public SessionUser requireCurrent(Long userId) {
        UserRecord user = users.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("authentication_required", "Authentication is required."));
        if (user.isDeleted()) {
            throw ApiException.unauthorized("account_deleted", "This account has been deleted.");
        }
        if (!user.isActive()) {
            throw ApiException.unauthorized("account_inactive", "This account is not active.");
        }
        return new SessionUser(user);
    }
}
