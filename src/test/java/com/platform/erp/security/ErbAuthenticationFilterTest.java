package com.platform.erp.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ErbAuthenticationFilterTest {

    private ErbSecurityService securityService;
    private ErbAuthenticationFilter filter;
    private FilterChain filterChain;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        securityService = Mockito.mock(ErbSecurityService.class);
        objectMapper = new ObjectMapper();
        filter = new ErbAuthenticationFilter(securityService, objectMapper);
        filterChain = Mockito.mock(FilterChain.class);

        when(securityService.isAuthEnabled()).thenReturn(true);
    }

    @Test
    @DisplayName("Should allow request with valid HTTP Basic Auth credentials")
    void testBasicAuth_Success() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/erp/Opti/files");
        MockHttpServletResponse response = new MockHttpServletResponse();

        String rawCreds = "admin:ErpAdmin2026!";
        String base64Creds = Base64.getEncoder().encodeToString(rawCreds.getBytes(StandardCharsets.UTF_8));
        request.addHeader("Authorization", "Basic " + base64Creds);

        when(securityService.authenticate("admin", "ErpAdmin2026!")).thenReturn(Optional.of("admin"));

        filter.doFilterInternal(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain, times(1)).doFilter(request, response);
        assertEquals("admin", request.getAttribute("authenticatedUser"));
    }

    @Test
    @DisplayName("Should return 401 Unauthorized with invalid HTTP Basic Auth password")
    void testBasicAuth_InvalidCredentials() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/erp/Opti/files");
        MockHttpServletResponse response = new MockHttpServletResponse();

        String rawCreds = "admin:WrongPassword!";
        String base64Creds = Base64.getEncoder().encodeToString(rawCreds.getBytes(StandardCharsets.UTF_8));
        request.addHeader("Authorization", "Basic " + base64Creds);

        when(securityService.authenticate("admin", "WrongPassword!")).thenReturn(Optional.empty());

        filter.doFilterInternal(request, response, filterChain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getHeader("WWW-Authenticate").contains("Basic"));
        assertTrue(response.getContentAsString().contains("UNAUTHORIZED"));
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized when credentials are missing completely")
    void testMissingCredentials_Unauthorized() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/erp/Opti/files");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getHeader("WWW-Authenticate").contains("Basic"));
        assertTrue(response.getContentAsString().contains("Authentication required"));
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Should allow request with valid custom X-ERB headers")
    void testCustomHeaders_Success() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/erp/files");
        MockHttpServletResponse response = new MockHttpServletResponse();

        request.addHeader("X-ERB-Username", "operator");
        request.addHeader("X-ERB-Password", "OpSecret123!");

        when(securityService.authenticate("operator", "OpSecret123!")).thenReturn(Optional.of("operator"));

        filter.doFilterInternal(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain, times(1)).doFilter(request, response);
        assertEquals("operator", request.getAttribute("authenticatedUser"));
    }

    @Test
    @DisplayName("Should allow request with valid Bearer token")
    void testBearerToken_Success() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/erp/transactions/stats");
        MockHttpServletResponse response = new MockHttpServletResponse();

        request.addHeader("Authorization", "Bearer valid_long_session_token_1234567890");
        when(securityService.validateSessionToken("valid_long_session_token_1234567890")).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should skip filter for public endpoints (login, actuator, static)")
    void testShouldNotFilter() {
        MockHttpServletRequest loginReq = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        assertTrue(filter.shouldNotFilter(loginReq));

        MockHttpServletRequest healthReq = new MockHttpServletRequest("GET", "/actuator/health");
        assertTrue(filter.shouldNotFilter(healthReq));

        MockHttpServletRequest staticReq = new MockHttpServletRequest("GET", "/assets/index-CuyzQS5b.js");
        assertTrue(filter.shouldNotFilter(staticReq));

        MockHttpServletRequest optionsReq = new MockHttpServletRequest("OPTIONS", "/api/v1/erp/Opti/files");
        assertTrue(filter.shouldNotFilter(optionsReq));

        MockHttpServletRequest erpReq = new MockHttpServletRequest("POST", "/api/v1/erp/Opti/files");
        assertFalse(filter.shouldNotFilter(erpReq));
    }
}
