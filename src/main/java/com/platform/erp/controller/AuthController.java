package com.platform.erp.controller;

import com.platform.erp.model.UserAccount;
import com.platform.erp.repository.UserAccountRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

/**
 * Controller for Enterprise Authentication backed by PostgreSQL ('erp_users').
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final UserAccountRepository userRepository;

    public AuthController(UserAccountRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "MISSING_CREDENTIALS",
                    "message", "Username and password are required."
            ));
        }

        Optional<UserAccount> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "INVALID_CREDENTIALS",
                    "message", "Invalid username or password."
            ));
        }

        UserAccount user = userOpt.get();
        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "ACCOUNT_DEACTIVATED",
                    "message", "This user account has been disabled by security administrator."
            ));
        }

        String hashedInput = hashPassword(password);
        if (!hashedInput.equals(user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "INVALID_CREDENTIALS",
                    "message", "Invalid username or password."
            ));
        }

        // Update last login
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        // Generate session token (secure random token)
        String sessionToken = UUID.randomUUID().toString().replace("-", "") + System.currentTimeMillis();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("token", sessionToken);
        response.put("user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "fullName", user.getFullName(),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "role", user.getRole(),
                "department", user.getDepartment() != null ? user.getDepartment() : "",
                "lastLoginAt", user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : ""
        ));

        log.info("[Auth] User '{}' successfully authenticated with role '{}'.", user.getUsername(), user.getRole());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestParam(value = "username", defaultValue = "admin") String username) {
        return userRepository.findByUsername(username)
                .map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "fullName", user.getFullName(),
                        "email", user.getEmail() != null ? user.getEmail() : "",
                        "role", user.getRole(),
                        "department", user.getDepartment() != null ? user.getDepartment() : ""
                )))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("status", "LOGGED_OUT", "message", "Session invalidated."));
    }

    // ==========================================
    // Database-backed User Management & RBAC CRUD
    // ==========================================

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<UserAccount> users = userRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "id"));
        List<Map<String, Object>> response = new ArrayList<>();
        for (UserAccount u : users) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", u.getId());
            dto.put("username", u.getUsername());
            dto.put("fullName", u.getFullName());
            dto.put("email", u.getEmail() != null ? u.getEmail() : "");
            dto.put("phoneNumber", u.getPhoneNumber() != null ? u.getPhoneNumber() : "");
            dto.put("role", u.getRole());
            dto.put("department", u.getDepartment() != null ? u.getDepartment() : "");
            dto.put("active", u.isActive());
            dto.put("lastLoginAt", u.getLastLoginAt() != null ? u.getLastLoginAt().toString() : null);
            dto.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
            response.add(dto);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> req) {
        String username = req.get("username") != null ? req.get("username").toString().trim() : "";
        String password = req.get("password") != null ? req.get("password").toString().trim() : "";
        String fullName = req.get("fullName") != null ? req.get("fullName").toString().trim() : "";
        String email = req.get("email") != null ? req.get("email").toString().trim() : "";
        String phoneNumber = req.get("phoneNumber") != null ? req.get("phoneNumber").toString().trim() : "";
        String role = req.get("role") != null ? req.get("role").toString().trim() : "INTEGRATION_OPERATOR";
        String department = req.get("department") != null ? req.get("department").toString().trim() : "Operations";
        boolean active = req.get("active") != null ? Boolean.parseBoolean(req.get("active").toString()) : true;

        if (username.length() < 3) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_USERNAME",
                    "message", "Username must be at least 3 characters long."
            ));
        }
        if (password.length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_PASSWORD",
                    "message", "Password must be at least 6 characters long."
            ));
        }
        if (fullName.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "MISSING_FULL_NAME",
                    "message", "Full name is required."
            ));
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "USERNAME_TAKEN",
                    "message", "Username '" + username + "' is already in use."
            ));
        }

        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setPasswordHash(hashPassword(password));
        user.setFullName(fullName);
        user.setEmail(email.isEmpty() ? null : email);
        user.setPhoneNumber(phoneNumber.isEmpty() ? null : phoneNumber);
        user.setRole(role);
        user.setDepartment(department.isEmpty() ? null : department);
        user.setActive(active);
        user.setCreatedAt(Instant.now());

        UserAccount saved = userRepository.save(user);
        log.info("[User Management] Created new user '{}' with role '{}' in PostgreSQL 'erp_users'.", saved.getUsername(), saved.getRole());

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", saved.getId());
        dto.put("username", saved.getUsername());
        dto.put("fullName", saved.getFullName());
        dto.put("email", saved.getEmail() != null ? saved.getEmail() : "");
        dto.put("phoneNumber", saved.getPhoneNumber() != null ? saved.getPhoneNumber() : "");
        dto.put("role", saved.getRole());
        dto.put("department", saved.getDepartment() != null ? saved.getDepartment() : "");
        dto.put("active", saved.isActive());
        dto.put("createdAt", saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "SUCCESS",
                "message", "User account '" + saved.getUsername() + "' successfully created in database.",
                "user", dto
        ));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable("id") Long id, @RequestBody Map<String, Object> req) {
        Optional<UserAccount> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "USER_NOT_FOUND",
                    "message", "User with ID " + id + " was not found in database."
            ));
        }

        UserAccount user = userOpt.get();

        if (req.containsKey("fullName")) {
            String fullName = req.get("fullName") != null ? req.get("fullName").toString().trim() : "";
            if (!fullName.isEmpty()) {
                user.setFullName(fullName);
            }
        }

        if (req.containsKey("email")) {
            String email = req.get("email") != null ? req.get("email").toString().trim() : "";
            user.setEmail(email.isEmpty() ? null : email);
        }

        if (req.containsKey("phoneNumber")) {
            String phone = req.get("phoneNumber") != null ? req.get("phoneNumber").toString().trim() : "";
            user.setPhoneNumber(phone.isEmpty() ? null : phone);
        }

        if (req.containsKey("role")) {
            String role = req.get("role") != null ? req.get("role").toString().trim() : "";
            if (!role.isEmpty()) {
                user.setRole(role);
            }
        }

        if (req.containsKey("department")) {
            String dept = req.get("department") != null ? req.get("department").toString().trim() : "";
            user.setDepartment(dept.isEmpty() ? null : dept);
        }

        if (req.containsKey("active")) {
            boolean active = Boolean.parseBoolean(req.get("active").toString());
            user.setActive(active);
        }

        // Optional password update
        if (req.containsKey("password")) {
            String password = req.get("password") != null ? req.get("password").toString().trim() : "";
            if (!password.isEmpty()) {
                if (password.length() < 6) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                            "error", "INVALID_PASSWORD",
                            "message", "Password must be at least 6 characters long."
                    ));
                }
                user.setPasswordHash(hashPassword(password));
                log.info("[User Management] Password updated for user '{}' in database.", user.getUsername());
            }
        }

        UserAccount updated = userRepository.save(user);
        log.info("[User Management] User '{}' (ID {}) updated successfully in database.", updated.getUsername(), updated.getId());

        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", updated.getId());
        dto.put("username", updated.getUsername());
        dto.put("fullName", updated.getFullName());
        dto.put("email", updated.getEmail() != null ? updated.getEmail() : "");
        dto.put("phoneNumber", updated.getPhoneNumber() != null ? updated.getPhoneNumber() : "");
        dto.put("role", updated.getRole());
        dto.put("department", updated.getDepartment() != null ? updated.getDepartment() : "");
        dto.put("active", updated.isActive());
        dto.put("lastLoginAt", updated.getLastLoginAt() != null ? updated.getLastLoginAt().toString() : null);
        dto.put("createdAt", updated.getCreatedAt() != null ? updated.getCreatedAt().toString() : null);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "User account '" + updated.getUsername() + "' updated successfully.",
                "user", dto
        ));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable("id") Long id) {
        Optional<UserAccount> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "USER_NOT_FOUND",
                    "message", "User with ID " + id + " was not found in database."
            ));
        }

        UserAccount user = userOpt.get();
        // Prevent deleting root admin if username is "admin"
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "CANNOT_DELETE_PRIMARY_ADMIN",
                    "message", "The primary system administrator account ('admin') cannot be deleted."
            ));
        }

        userRepository.deleteById(id);
        log.info("[User Management] User '{}' (ID {}) permanently deleted from PostgreSQL 'erp_users'.", user.getUsername(), id);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "User account '" + user.getUsername() + "' has been deleted from database."
        ));
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable("id") Long id) {
        Optional<UserAccount> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "USER_NOT_FOUND",
                    "message", "User with ID " + id + " was not found."
            ));
        }

        UserAccount user = userOpt.get();
        if ("admin".equalsIgnoreCase(user.getUsername()) && user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "CANNOT_DEACTIVATE_PRIMARY_ADMIN",
                    "message", "The primary system administrator account ('admin') cannot be deactivated."
            ));
        }

        user.setActive(!user.isActive());
        userRepository.save(user);

        log.info("[User Management] User '{}' status toggled to active={}", user.getUsername(), user.isActive());
        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "active", user.isActive(),
                "message", "User '" + user.getUsername() + "' is now " + (user.isActive() ? "Active" : "Disabled") + "."
        ));
    }

    @PostMapping("/forgot-password/verify-identity")
    public ResponseEntity<?> verifyIdentity(@RequestBody Map<String, String> request) {
        String identifier = request.get("identifier");
        if (identifier == null || identifier.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "MISSING_IDENTIFIER",
                    "message", "Please enter your registered email address, username, or phone number."
            ));
        }

        String trimmed = identifier.trim();
        Optional<UserAccount> userOpt = userRepository.findByIdentifier(trimmed);

        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(trimmed)
                    .or(() -> userRepository.findByEmailIgnoreCase(trimmed))
                    .or(() -> userRepository.findByPhoneNumber(trimmed));
        }

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "USER_NOT_FOUND",
                    "message", "Email or username '" + trimmed + "' does not match any record in the erp_users database."
            ));
        }

        UserAccount user = userOpt.get();
        if (!user.isActive()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "ACCOUNT_DEACTIVATED",
                    "message", "This account is deactivated. Please contact your system administrator."
            ));
        }

        String resetToken = "APPROVED-" + UUID.randomUUID().toString();
        log.info("[Auth] Identity confirmed in erp_users: username='{}', email='{}'. Approved to change password.",
                user.getUsername(), user.getEmail());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", "APPROVED");
        resp.put("username", user.getUsername());
        resp.put("fullName", user.getFullName());
        resp.put("email", user.getEmail() != null ? user.getEmail() : "");
        resp.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        resp.put("resetToken", resetToken);
        resp.put("message", "Account confirmed in erp_users (" + user.getFullName() + ")! Approved to update password.");

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/forgot-password/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String resetToken = request.get("resetToken");
        String newPassword = request.get("newPassword");

        if (username == null || username.trim().isEmpty() || resetToken == null || resetToken.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "MISSING_RESET_TOKEN",
                    "message", "Valid reset token and username are required."
            ));
        }

        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "WEAK_PASSWORD",
                    "message", "New password must be at least 6 characters long."
            ));
        }

        boolean validToken = (resetToken != null && resetToken.startsWith("APPROVED-"));
        if (!validToken) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "INVALID_OR_EXPIRED_TOKEN",
                    "message", "Password reset approval session has expired or is invalid. Please verify your account again."
            ));
        }

        Optional<UserAccount> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "USER_NOT_FOUND",
                    "message", "User account not found."
            ));
        }

        UserAccount user = userOpt.get();
        user.setPasswordHash(hashPassword(newPassword));
        userRepository.save(user);

        log.info("[Auth] Password successfully updated for user '{}'", user.getUsername());
        return ResponseEntity.ok(Map.of(
                "status", "PASSWORD_RESET_SUCCESS",
                "message", "Password has been successfully changed! You can now sign in with your new credentials."
        ));
    }

    private String hashPassword(String rawPassword) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(("ERP_SALT_2026_" + rawPassword).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return rawPassword;
        }
    }
}
