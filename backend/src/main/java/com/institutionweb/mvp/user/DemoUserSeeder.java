package com.institutionweb.mvp.user;

import java.time.Instant;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserSeeder implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public DemoUserSeeder(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("admin@example.com", "Local Administrator", "Admin1234!", "SOCIETY_ADMIN");
        seed("member@example.com", "Local Member", "Member1234!", "MEMBER");
    }

    private void seed(String email, String displayName, String password, String role) {
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            return;
        }
        Instant now = Instant.now();
        users.insert(email, displayName, passwordEncoder.encode(password), role, "ACTIVE", now);
    }
}
