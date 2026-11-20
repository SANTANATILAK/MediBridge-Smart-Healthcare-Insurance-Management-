package com.medibridge.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * One hospital visit. Its {@code uhtId} (Universal Healthcare Transaction ID) is the thread that ties
 * admission, pre-authorization, bills, documents, claims and settlement into a single traceable journey.
 */
@Entity
@Table(name = "visits")
@Getter
@Setter
@NoArgsConstructor
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String uhtId;

    private Long patientId;
    private Long hospitalId;
    private Long policyId;
    private String diagnosis;
    private String ward;

    private LocalDateTime admittedAt = LocalDateTime.now();
    private LocalDateTime dischargedAt;

    /** ADMITTED or DISCHARGED */
    private String status = "ADMITTED";

    @Column(precision = 15, scale = 2)
    private BigDecimal estimatedBill = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal finalBill;

    /** NOT_REQUESTED, APPROVED, PENDING_REVIEW or NO_ACTIVE_POLICY */
    private String preAuthStatus = "NOT_REQUESTED";

    @Column(precision = 15, scale = 2)
    private BigDecimal preAuthAmount;

    public static String newUhtId() {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "UHT-" + date + "-" + random;
    }
}
