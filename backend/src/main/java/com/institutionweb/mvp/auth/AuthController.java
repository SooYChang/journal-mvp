package com.institutionweb.mvp.auth;

import com.institutionweb.mvp.common.api.ApiException;
import com.institutionweb.mvp.member.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final MemberService members;

    public AuthController(AuthService authService, MemberService members) {
        this.authService = authService;
        this.members = members;
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AuthUserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return new AuthUserResponse(authService.login(request, httpRequest), sessionId(httpRequest));
    }

    @PostMapping(path = "/login", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void loginForm(
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam(name = "returnTo", required = false) String returnTo,
            HttpServletRequest httpRequest,
            HttpServletResponse response)
            throws IOException {
        try {
            authService.login(new LoginRequest(email, password), httpRequest);
            response.sendRedirect(safeReturnTo(returnTo));
        } catch (ApiException ex) {
            response.sendRedirect("/login?error=" + ex.error());
        }
    }

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AuthUserResponse register(@RequestBody RegisterReaderRequest request, HttpServletRequest httpRequest) {
        members.registerReader(request.email(), request.displayName(), request.affiliation(), request.password());
        UserDto user = authService.login(new LoginRequest(request.email(), request.password()), httpRequest);
        return new AuthUserResponse(user, sessionId(httpRequest));
    }

    @GetMapping("/me")
    public AuthUserResponse me(HttpServletRequest httpRequest) {
        return new AuthUserResponse(authService.me(), sessionId(httpRequest));
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request) {
        authService.logout(request);
        return Map.of("status", "ok");
    }

    private static String sessionId(HttpServletRequest httpRequest) {
        if (httpRequest.getSession(false) == null) {
            return null;
        }
        return httpRequest.getSession(false).getId();
    }

    public record RegisterReaderRequest(String email, String displayName, String affiliation, String password) {}

    private static String safeReturnTo(String returnTo) {
        if (returnTo != null
                && returnTo.startsWith("/")
                && !returnTo.startsWith("//")
                && !returnTo.startsWith("/\\")) {
            return returnTo;
        }
        return "/";
    }
}
