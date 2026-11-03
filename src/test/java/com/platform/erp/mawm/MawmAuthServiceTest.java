package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MawmAuthServiceTest {

    @Test
    void shouldReportAuthStatus() {
        MawmProperties properties = new MawmProperties();
        properties.setAuthUrl("https://ncsps-auth.sce.manh.com/oauth/token");
        properties.setUsername("lezhilarasan");
        MawmAuthService authService = new MawmAuthService(properties, new ObjectMapper());

        Map<String, Object> status = authService.getAuthStatus();
        assertNotNull(status);
        assertEquals("https://ncsps-auth.sce.manh.com/oauth/token", status.get("authUrl"));
        assertEquals("lezhilarasan", status.get("username"));
        assertEquals(false, status.get("hasCachedToken"));
    }

    @Test
    void shouldInvalidateToken() {
        MawmProperties properties = new MawmProperties();
        MawmAuthService authService = new MawmAuthService(properties, new ObjectMapper());

        authService.invalidateToken();
        Map<String, Object> status = authService.getAuthStatus();
        assertEquals(false, status.get("hasCachedToken"));
    }
}
