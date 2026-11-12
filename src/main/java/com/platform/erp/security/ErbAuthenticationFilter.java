package com.platform.erp.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * HTTP Basic Authentication and Token Filter for all inbound Host-to-ERB API endpoints.
 * Requires valid username and password credentials on /api/v1/erp/** and proxy endpoints.
 */
@Component
public class ErbAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ErbAuthenticationFilter.class);

    private final ErbSecurityService securityService;
    private final ObjectMapper objectMapper;

    public ErbAuthenticationFilter(ErbSecurityService securityService, ObjectMapper objectMapper) {
        this.securityService = securityService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!securityService.isAuthEnabled()) {
            return true;
        }

        // Allow CORS preflight requests without authentication
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();
        if (uri == null) {
            return false;
        }

        // Public authentication and password-reset endpoints
        if (uri.startsWith("/api/v1/auth/")) {
            return true;
        }

        // Container / AWS EC2 health check endpoints
        if (uri.startsWith("/actuator/")) {
            return true;
        }

        // Static frontend application assets and resources
        if (uri.equals("/") || uri.equals("/index.html") || uri.startsWith("/assets/")
                || uri.equals("/favicon.ico") || uri.equals("/favicon.svg") || uri.equals("/favicon.png")
                || uri.equals("/robots.txt") || uri.equals("/manifest.json")) {
            return true;
        }

        // File extensions for static web resources
        String lower = uri.toLowerCase();
        return lower.endsWith(".js") || lower.endsWith(".css") || lower.endsWith(".png")
                || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".svg")
                || lower.endsWith(".ico") || lower.endsWith(".woff") || lower.endsWith(".woff2")
                || lower.endsWith(".ttf");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // 1. HTTP Basic Authentication: 'Authorization: Basic <base64(user:pass)>'
        if (authHeader != null && authHeader.toLowerCase().startsWith("basic ")) {
            try {
                String base64 = authHeader.substring(6).trim();
                byte[] decoded = Base64.getDecoder().decode(base64);
                String credentials = new String(decoded, StandardCharsets.UTF_8);
                String[] parts = credentials.split(":", 2);

                if (parts.length == 2) {
                    String username = parts[0];
                    String password = parts[1];
                    Optional<String> authUser = securityService.authenticate(username, password);

                    if (authUser.isPresent()) {
                        request.setAttribute("authenticatedUser", authUser.get());
                        log.debug("[Host Auth] Authenticated host via Basic Auth: '{}' for path: {}", authUser.get(), request.getRequestURI());
                        filterChain.doFilter(request, response);
                        return;
                    } else {
                        log.warn("[Host Auth] Invalid credentials for user '{}' on path: {}", username, request.getRequestURI());
                        sendUnauthorized(response, request.getRequestURI(), "Invalid username or password credentials.");
                        return;
                    }
                }
            } catch (Exception ex) {
                log.warn("[Host Auth] Malformed Basic Auth header: {}", ex.getMessage());
                sendUnauthorized(response, request.getRequestURI(), "Malformed HTTP Basic Authorization header.");
                return;
            }
        }

        // 2. Bearer Session Token: 'Authorization: Bearer <token>'
        if (authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
            String token = authHeader.substring(7).trim();
            if (securityService.validateSessionToken(token)) {
                request.setAttribute("authenticatedUser", "session-user");
                filterChain.doFilter(request, response);
                return;
            } else {
                log.warn("[Host Auth] Invalid Bearer token on path: {}", request.getRequestURI());
                sendUnauthorized(response, request.getRequestURI(), "Invalid or expired Bearer token.");
                return;
            }
        }

        // 3. Custom Headers: 'X-ERB-Username' and 'X-ERB-Password'
        String xUser = request.getHeader("X-ERB-Username");
        String xPass = request.getHeader("X-ERB-Password");
        if (xUser != null && !xUser.isBlank() && xPass != null) {
            Optional<String> authUser = securityService.authenticate(xUser, xPass);
            if (authUser.isPresent()) {
                request.setAttribute("authenticatedUser", authUser.get());
                log.debug("[Host Auth] Authenticated host via X-ERB headers: '{}' for path: {}", authUser.get(), request.getRequestURI());
                filterChain.doFilter(request, response);
                return;
            } else {
                log.warn("[Host Auth] Invalid credentials in X-ERB headers for user '{}' on path: {}", xUser, request.getRequestURI());
                sendUnauthorized(response, request.getRequestURI(), "Invalid username or password credentials in X-ERB headers.");
                return;
            }
        }

        // 4. Session Token Header: 'X-Session-Token'
        String sessToken = request.getHeader("X-Session-Token");
        if (sessToken != null && securityService.validateSessionToken(sessToken)) {
            request.setAttribute("authenticatedUser", "session-user");
            filterChain.doFilter(request, response);
            return;
        }

        // 5. Missing Credentials -> Reject with 401 Unauthorized
        log.warn("[Host Auth] Missing credentials for protected ERB endpoint: {}", request.getRequestURI());
        sendUnauthorized(response, request.getRequestURI(),
                "Authentication required to access ERB endpoint. Please provide valid username and password credentials via HTTP Basic Auth (Authorization: Basic <base64>) or custom headers (X-ERB-Username, X-ERB-Password).");
    }

    private void sendUnauthorized(HttpServletResponse response, String path, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader("WWW-Authenticate", "Basic realm=\"ERB Gateway\"");
        response.setContentType("application/json;charset=UTF-8");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "UNAUTHORIZED");
        body.put("message", message);
        body.put("statusCode", 401);
        body.put("path", path);
        body.put("timestamp", Instant.now().toString());

        response.getWriter().write(objectMapper.writeValueAsString(body));
        response.getWriter().flush();
    }
}

