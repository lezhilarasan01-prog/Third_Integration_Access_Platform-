package com.platform.erp.security;

import com.platform.erp.model.UserAccount;
import com.platform.erp.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class ErbSecurityServiceTest {

    private UserAccountRepository userRepository;
    private ErbSecurityService securityService;

    @BeforeEach
    void setUp() {
        userRepository = Mockito.mock(UserAccountRepository.class);
        securityService = new ErbSecurityService(userRepository, true, "admin", "ErpAdmin2026!");
    }

    @Test
    @DisplayName("Should successfully authenticate with default platform credentials")
    void testAuthenticate_DefaultCredentials_Success() {
        Optional<String> auth = securityService.authenticate("admin", "ErpAdmin2026!");
        assertTrue(auth.isPresent());
        assertEquals("admin", auth.get());
    }

    @Test
    @DisplayName("Should reject authentication with invalid password for default platform credentials")
    void testAuthenticate_DefaultCredentials_WrongPassword() {
        Optional<String> auth = securityService.authenticate("admin", "WrongPassword!");
        assertFalse(auth.isPresent());
    }

    @Test
    @DisplayName("Should successfully authenticate with active database user credentials")
    void testAuthenticate_DatabaseUser_Success() {
        String rawPass = "MySecurePass123!";
        String hash = securityService.hashPassword(rawPass);

        UserAccount user = new UserAccount("operator", hash, "Test Operator", "operator@example.com", "INTEGRATION_OPERATOR", "Ops");
        user.setActive(true);

        when(userRepository.findByIdentifier("operator")).thenReturn(Optional.of(user));

        Optional<String> auth = securityService.authenticate("operator", rawPass);
        assertTrue(auth.isPresent());
        assertEquals("operator", auth.get());
    }

    @Test
    @DisplayName("Should reject authentication for deactivated database user")
    void testAuthenticate_DatabaseUser_Deactivated() {
        String rawPass = "MySecurePass123!";
        String hash = securityService.hashPassword(rawPass);

        UserAccount user = new UserAccount("inactive_user", hash, "Inactive User", "inactive@example.com", "INTEGRATION_OPERATOR", "Ops");
        user.setActive(false);

        when(userRepository.findByIdentifier("inactive_user")).thenReturn(Optional.of(user));

        Optional<String> auth = securityService.authenticate("inactive_user", rawPass);
        assertFalse(auth.isPresent());
    }

    @Test
    @DisplayName("Should reject authentication when database user does not exist")
    void testAuthenticate_DatabaseUser_NotFound() {
        when(userRepository.findByIdentifier(anyString())).thenReturn(Optional.empty());

        Optional<String> auth = securityService.authenticate("unknown_user", "SomePassword!");
        assertFalse(auth.isPresent());
    }

    @Test
    @DisplayName("Should reject authentication when credentials are empty or null")
    void testAuthenticate_EmptyOrNull() {
        assertFalse(securityService.authenticate(null, "pass").isPresent());
        assertFalse(securityService.authenticate("user", null).isPresent());
        assertFalse(securityService.authenticate("", "").isPresent());
    }

    @Test
    @DisplayName("Should validate valid session token")
    void testValidateSessionToken() {
        assertTrue(securityService.validateSessionToken("4d75f873cb3a4699ae6d65329d00352f1731411234567"));
        assertFalse(securityService.validateSessionToken(null));
        assertFalse(securityService.validateSessionToken("short"));
        assertFalse(securityService.validateSessionToken(""));
    }

    @Test
    @DisplayName("Should bypass authentication when disabled")
    void testAuthDisabled_Bypass() {
        ErbSecurityService disabledService = new ErbSecurityService(userRepository, false, "admin", "ErpAdmin2026!");
        Optional<String> auth = disabledService.authenticate("any_caller", "any_pass");
        assertTrue(auth.isPresent());
        assertEquals("any_caller", auth.get());
    }
}
