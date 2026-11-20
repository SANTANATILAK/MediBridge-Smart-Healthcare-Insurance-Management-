package com.medibridge.repository;

import com.medibridge.model.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {
    List<Hospital> findByCityContainingIgnoreCase(String city);
}
