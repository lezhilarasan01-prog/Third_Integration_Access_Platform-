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
        // Default constructor: No hardcoded service account credentials
        securityService = new ErbSecurityService(userRepository, true, "ERP_SALT_2026_", "", "");
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
    @DisplayName("Should successfully authenticate via configured external service account when provided")
    void testAuthenticate_ConfiguredServiceAccount_Success() {
        ErbSecurityService svcWithAccount = new ErbSecurityService(
                userRepository, true, "ERP_SALT_2026_", "svc_partner_erp", "PartnerTokenSecure2026!");

        when(userRepository.findByIdentifier(anyString())).thenReturn(Optional.empty());

        Optional<String> auth = svcWithAccount.authenticate("svc_partner_erp", "PartnerTokenSecure2026!");
        assertTrue(auth.isPresent());
        assertEquals("svc_partner_erp", auth.get());
    }

    @Test
    @DisplayName("Should reject authentication with invalid password for configured service account")
    void testAuthenticate_ConfiguredServiceAccount_WrongPassword() {
        ErbSecurityService svcWithAccount = new ErbSecurityService(
                userRepository, true, "ERP_SALT_2026_", "svc_partner_erp", "PartnerTokenSecure2026!");

        when(userRepository.findByIdentifier(anyString())).thenReturn(Optional.empty());

        Optional<String> auth = svcWithAccount.authenticate("svc_partner_erp", "WrongPassword!");
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
        ErbSecurityService disabledService = new ErbSecurityService(userRepository, false, "ERP_SALT_2026_", "", "");
        Optional<String> auth = disabledService.authenticate("any_caller", "any_pass");
        assertTrue(auth.isPresent());
        assertEquals("any_caller", auth.get());
    }
}
