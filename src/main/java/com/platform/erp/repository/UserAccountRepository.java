package com.platform.erp.repository;

import com.platform.erp.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsername(String username);
    Optional<UserAccount> findByEmailIgnoreCase(String email);
    Optional<UserAccount> findByPhoneNumber(String phoneNumber);
    boolean existsByUsername(String username);

    @Query("SELECT u FROM UserAccount u WHERE LOWER(u.username) = LOWER(:identifier) OR LOWER(u.email) = LOWER(:identifier) OR u.phoneNumber = :identifier")
    Optional<UserAccount> findByIdentifier(@Param("identifier") String identifier);
}
