package com.medibridge.repository;

import com.medibridge.model.Insurer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InsurerRepository extends JpaRepository<Insurer, Long> {
}
