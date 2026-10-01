package com.institutionweb.mvp.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return new AuthUserResponse(authService.login(request, httpRequest));
    }

    @GetMapping("/me")
    public AuthUserResponse me() {
        return new AuthUserResponse(authService.me());
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request) {
        authService.logout(request);
        return Map.of("status", "ok");
    }
}
