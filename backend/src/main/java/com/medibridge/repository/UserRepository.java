package com.medibridge.repository;

import com.medibridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findFirstByPatientId(Long patientId);
    Optional<User> findFirstByHospitalId(Long hospitalId);
    Optional<User> findFirstByInsurerId(Long insurerId);
}
