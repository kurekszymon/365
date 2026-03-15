package com.kurek.fckjvm.service;

import java.time.Instant;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import com.kurek.fckjvm.entity.User;
import com.kurek.fckjvm.repository.UserRepository;

@Service
public class UserSyncService {

    private final UserRepository userRepository;

    public UserSyncService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Finds or creates a local User from the Keycloak JWT. Called after
     * successful authentication to keep the users table in sync.
     */
    public User syncFromJwt(Jwt jwt) {
        String sub = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("preferred_username");

        return userRepository.findByExternalId(sub)
                .map(existing -> {
                    existing.setLastLoginAt(Instant.now());
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    var user = new User();
                    user.setExternalId(sub);
                    user.setEmail(email);
                    user.setDisplayName(name);
                    user.setLastLoginAt(Instant.now());
                    return userRepository.save(user);
                });
    }
}
