package com.medibridge.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims")
@Getter
@Setter
@NoArgsConstructor
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String claimNumber;

    /** Universal Healthcare Transaction ID of the visit this claim belongs to (may be null for OPD claims). */
    private String uhtId;
    private Long visitId;
    private Long patientId;
    private Long hospitalId;
    private Long insurerId;
    private Long policyId;

    @Column(precision = 15, scale = 2)
    private BigDecimal claimedAmount;

    @Column(precision = 15, scale = 2)
    private BigDecimal approvedAmount;

    @Enumerated(EnumType.STRING)
    private ClaimStatus status = ClaimStatus.SUBMITTED;

    /** Set by rule-based checks; a human investigator must review flagged claims. */
    private boolean fraudRisk;

    @Column(length = 500)
    private String fraudReason;

    @Column(length = 1000)
    private String description;

    @Column(length = 500)
    private String insurerNote;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
