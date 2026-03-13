package com.kurek.fckjvm.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kurek.fckjvm.entity.User;

// No @Repository needed — Spring Data provides the implementation at runtime.
// You get CRUD for free: save(), findById(), findAll(), delete(), count(), etc.
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByExternalId(String externalId);
}
