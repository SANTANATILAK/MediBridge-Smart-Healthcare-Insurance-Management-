package com.medibridge.repository;

import com.medibridge.model.Visit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VisitRepository extends JpaRepository<Visit, Long> {
    List<Visit> findByPatientIdOrderByAdmittedAtDesc(Long patientId);
    List<Visit> findByHospitalIdOrderByAdmittedAtDesc(Long hospitalId);
    Optional<Visit> findByUhtId(String uhtId);
}
