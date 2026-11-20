package com.medibridge.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "policies")
@Getter
@Setter
@NoArgsConstructor
public class Policy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String policyNumber;

    private Long patientId;
    private Long insurerId;
    private String planName;

    @Column(precision = 15, scale = 2)
    private BigDecimal sumInsured = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal usedAmount = BigDecimal.ZERO;

    private LocalDate validFrom;
    private LocalDate validTo;
    private boolean active = true;

    /** Computed, serialized to JSON as remainingCoverage. Not persisted. */
    public BigDecimal getRemainingCoverage() {
        return sumInsured.subtract(usedAmount);
    }
}
