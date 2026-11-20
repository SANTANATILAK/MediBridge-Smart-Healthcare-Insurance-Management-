package com.medibridge.repository;

import com.medibridge.model.Claim;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    List<Claim> findByHospitalIdOrderByCreatedAtDesc(Long hospitalId);
    List<Claim> findByInsurerIdOrderByCreatedAtDesc(Long insurerId);
    List<Claim> findByVisitId(Long visitId);
    boolean existsByVisitId(Long visitId);
}
