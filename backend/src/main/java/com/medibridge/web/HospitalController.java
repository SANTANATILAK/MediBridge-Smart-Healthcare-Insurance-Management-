package com.medibridge.web;

import com.medibridge.model.*;
import com.medibridge.repository.*;
import com.medibridge.security.AuthUser;
import com.medibridge.service.ClaimService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/hospital")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalRepository hospitals;
    private final PatientRepository patients;
    private final PolicyRepository policies;
    private final VisitRepository visits;
    private final ClaimRepository claims;
    private final ClaimService claimService;

    public record AdmitRequest(@NotBlank String patientCode,
                               Long policyId,
                               String diagnosis,
                               String ward,
                               BigDecimal estimatedBill) {}

    public record DischargeRequest(BigDecimal finalBill) {}

    public record HospitalClaimRequest(@NotNull Long visitId, BigDecimal amount, String description) {}

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal AuthUser me) {
        List<Visit> vs = visits.findByHospitalIdOrderByAdmittedAtDesc(me.hospitalId());
        List<Claim> cs = claims.findByHospitalIdOrderByCreatedAtDesc(me.hospitalId());

        BigDecimal billed = vs.stream()
                .map(v -> v.getFinalBill() != null ? v.getFinalBill() : v.getEstimatedBill())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal approved = cs.stream().map(Claim::getApprovedAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("admitted", vs.stream().filter(v -> "ADMITTED".equals(v.getStatus())).count());
        stats.put("discharged", vs.stream().filter(v -> "DISCHARGED".equals(v.getStatus())).count());
        stats.put("pendingPreAuth", vs.stream().filter(v -> "PENDING_REVIEW".equals(v.getPreAuthStatus())).count());
        stats.put("totalBilled", billed);
        stats.put("claimsSubmitted", cs.size());
        stats.put("approvedValue", approved);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("hospital", hospitals.findById(me.hospitalId()).orElseThrow());
        res.put("visits", vs);
        res.put("claims", cs);
        res.put("stats", stats);
        return res;
    }

    /** Patient lookup used during admission. Returns each matching patient with their active policies. */
    @GetMapping("/patients")
    public List<Map<String, Object>> findPatients(@RequestParam(defaultValue = "") String q) {
        return patients.findByFullNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(q.trim(), q.trim()).stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("patient", p);
                    m.put("policies", policies.findByPatientIdAndActiveTrue(p.getId()));
                    return m;
                }).toList();
    }

    /** Admit a patient: creates the UHT ID and runs an automatic pre-authorization check against coverage. */
    @PostMapping("/visits")
    public Visit admit(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody AdmitRequest r) {
        Patient patient = patients.findByPatientCode(r.patientCode().trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("No patient found with code " + r.patientCode()));

        Policy policy = r.policyId() != null
                ? policies.findById(r.policyId()).filter(p -> p.getPatientId().equals(patient.getId())).orElse(null)
                : policies.findByPatientIdAndActiveTrue(patient.getId()).stream().findFirst().orElse(null);

        BigDecimal estimate = r.estimatedBill() != null ? r.estimatedBill() : BigDecimal.ZERO;

        Visit v = new Visit();
        v.setUhtId(Visit.newUhtId());
        v.setPatientId(patient.getId());
        v.setHospitalId(me.hospitalId());
        v.setDiagnosis(r.diagnosis());
        v.setWard(r.ward());
        v.setEstimatedBill(estimate);

        if (policy == null) {
            v.setPreAuthStatus("NO_ACTIVE_POLICY");
        } else {
            BigDecimal remaining = policy.getRemainingCoverage();
            v.setPolicyId(policy.getId());
            v.setPreAuthAmount(estimate.min(remaining));
            v.setPreAuthStatus(estimate.compareTo(remaining) <= 0 ? "APPROVED" : "PENDING_REVIEW");
        }
        return visits.save(v);
    }

    @PostMapping("/visits/{id}/discharge")
    public Visit discharge(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                           @RequestBody(required = false) DischargeRequest r) {
        Visit v = ownVisit(me, id);
        if (!"ADMITTED".equals(v.getStatus())) throw new IllegalStateException("This visit is already discharged");
        v.setFinalBill(r != null && r.finalBill() != null ? r.finalBill() : v.getEstimatedBill());
        v.setStatus("DISCHARGED");
        v.setDischargedAt(LocalDateTime.now());
        return visits.save(v);
    }

    @PostMapping("/claims")
    public Claim submitClaim(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody HospitalClaimRequest r) {
        Visit v = ownVisit(me, r.visitId());
        if (!"DISCHARGED".equals(v.getStatus())) throw new IllegalStateException("Claims can be submitted after discharge");
        if (v.getPolicyId() == null) throw new IllegalArgumentException("This visit has no active policy to claim against");
        Policy policy = policies.findById(v.getPolicyId()).orElseThrow();
        BigDecimal amount = r.amount() != null ? r.amount()
                : (v.getFinalBill() != null ? v.getFinalBill() : v.getEstimatedBill());
        return claimService.submit(policy, v, amount, r.description());
    }

    private Visit ownVisit(AuthUser me, Long id) {
        return visits.findById(id)
                .filter(v -> me.hospitalId() != null && me.hospitalId().equals(v.getHospitalId()))
                .orElseThrow(() -> new NoSuchElementException("Visit not found"));
    }
}
