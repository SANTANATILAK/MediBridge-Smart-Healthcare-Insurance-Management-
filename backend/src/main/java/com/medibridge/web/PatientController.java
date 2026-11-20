package com.medibridge.web;

import com.medibridge.model.*;
import com.medibridge.repository.*;
import com.medibridge.security.AuthUser;
import com.medibridge.service.ClaimService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientController {

    private final PatientRepository patients;
    private final PolicyRepository policies;
    private final VisitRepository visits;
    private final ClaimRepository claims;
    private final NotificationRepository notifications;
    private final ClaimService claimService;

    public record ProfileUpdate(String fullName, String phone, String city, String address, String bloodGroup) {}

    public record PatientClaimRequest(@NotNull Long policyId,
                                      Long visitId,
                                      @NotNull @DecimalMin("1") BigDecimal amount,
                                      String description) {}

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal AuthUser me) {
        Patient p = patients.findById(me.patientId()).orElseThrow(() -> new NoSuchElementException("Profile not found"));
        List<Policy> pols = policies.findByPatientId(p.getId());

        BigDecimal totalSum = pols.stream().map(Policy::getSumInsured).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRemaining = pols.stream().filter(Policy::isActive)
                .map(Policy::getRemainingCoverage).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("profile", p);
        res.put("policies", pols);
        res.put("visits", visits.findByPatientIdOrderByAdmittedAtDesc(p.getId()));
        res.put("claims", claims.findByPatientIdOrderByCreatedAtDesc(p.getId()));
        res.put("notifications", notifications.findByUserIdOrderByCreatedAtDesc(me.id()));
        res.put("totalSumInsured", totalSum);
        res.put("totalRemaining", totalRemaining);
        return res;
    }

    @PutMapping("/profile")
    public Patient updateProfile(@AuthenticationPrincipal AuthUser me, @RequestBody ProfileUpdate u) {
        Patient p = patients.findById(me.patientId()).orElseThrow(() -> new NoSuchElementException("Profile not found"));
        if (u.fullName() != null && !u.fullName().isBlank()) p.setFullName(u.fullName().trim());
        if (u.phone() != null) p.setPhone(u.phone());
        if (u.city() != null) p.setCity(u.city());
        if (u.address() != null) p.setAddress(u.address());
        if (u.bloodGroup() != null) p.setBloodGroup(u.bloodGroup());
        return patients.save(p);
    }

    @PostMapping("/claims")
    public Claim submitClaim(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PatientClaimRequest r) {
        Policy policy = policies.findById(r.policyId())
                .filter(p -> p.getPatientId().equals(me.patientId()))
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));
        Visit visit = null;
        if (r.visitId() != null) {
            visit = visits.findById(r.visitId())
                    .filter(v -> v.getPatientId().equals(me.patientId()))
                    .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        }
        return claimService.submit(policy, visit, r.amount(), r.description());
    }

    @PostMapping("/notifications/read-all")
    public Map<String, String> markAllRead(@AuthenticationPrincipal AuthUser me) {
        List<Notification> list = notifications.findByUserIdOrderByCreatedAtDesc(me.id());
        list.forEach(n -> n.setRead(true));
        notifications.saveAll(list);
        return Map.of("status", "ok");
    }
}
