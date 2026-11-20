package com.medibridge.repository;

import com.medibridge.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
    List<Policy> findByPatientId(Long patientId);
    List<Policy> findByPatientIdAndActiveTrue(Long patientId);
}
