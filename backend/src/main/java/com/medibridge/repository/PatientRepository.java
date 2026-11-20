package com.medibridge.repository;

import com.medibridge.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByPatientCode(String patientCode);
    List<Patient> findByFullNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(String name, String code);
}
