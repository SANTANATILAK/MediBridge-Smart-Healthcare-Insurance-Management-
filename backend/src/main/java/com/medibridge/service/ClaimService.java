package com.medibridge.service;

import com.medibridge.model.*;
import com.medibridge.repository.ClaimRepository;
import com.medibridge.repository.NotificationRepository;
import com.medibridge.repository.PolicyRepository;
import com.medibridge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Claim lifecycle: submission with rule-based fraud screening, insurer decisions, settlement and notifications.
 * Fraud rules only flag claims for human investigation; they never reject anything automatically.
 */
@Service
@RequiredArgsConstructor
public class ClaimService {

    private static final BigDecimal HIGH_VALUE_THRESHOLD = new BigDecimal("500000");

    private final ClaimRepository claims;
    private final PolicyRepository policies;
    private final UserRepository users;
    private final NotificationRepository notifications;

    public Claim submit(Policy policy, Visit visit, BigDecimal amount, String description) {
        if (policy == null) throw new IllegalArgumentException("No active policy is available for this claim");
        if (amount == null || amount.signum() <= 0) throw new IllegalArgumentException("Claim amount must be greater than zero");

        List<String> flags = new ArrayList<>();
        if (amount.compareTo(policy.getRemainingCoverage()) > 0) {
            flags.add("Claimed amount exceeds remaining coverage");
        }
        if (visit != null && claims.existsByVisitId(visit.getId())) {
            flags.add("Duplicate claim for the same visit");
        }
        if (amount.compareTo(HIGH_VALUE_THRESHOLD) > 0) {
            flags.add("High-value claim requires human verification");
        }

        Claim c = new Claim();
        c.setClaimNumber("CLM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setUhtId(visit != null ? visit.getUhtId() : null);
        c.setVisitId(visit != null ? visit.getId() : null);
        c.setPatientId(policy.getPatientId());
        c.setHospitalId(visit != null ? visit.getHospitalId() : null);
        c.setInsurerId(policy.getInsurerId());
        c.setPolicyId(policy.getId());
        c.setClaimedAmount(amount);
        c.setDescription(description);
        c.setFraudRisk(!flags.isEmpty());
        c.setFraudReason(String.join("; ", flags));
        Claim saved = claims.save(c);

        notifyUser(users.findFirstByPatientId(policy.getPatientId()).orElse(null),
                "Claim submitted",
                "Claim " + saved.getClaimNumber() + " for ₹" + amount.toPlainString() + " has been submitted.");
        notifyUser(users.findFirstByInsurerId(policy.getInsurerId()).orElse(null),
                "New claim received",
                "Claim " + saved.getClaimNumber() + " is waiting for review." + (saved.isFraudRisk() ? " Flagged for investigation." : ""));
        return saved;
    }

    public Claim decide(Claim c, String decision, BigDecimal approvedAmount, String note) {
        switch (decision) {
            case "APPROVE" -> {
                BigDecimal amount = approvedAmount != null ? approvedAmount : c.getClaimedAmount();
                Policy p = policies.findById(c.getPolicyId()).orElseThrow();
                if (amount.compareTo(p.getRemainingCoverage()) > 0) amount = p.getRemainingCoverage();
                c.setApprovedAmount(amount);
                c.setStatus(ClaimStatus.APPROVED);
            }
            case "REJECT" -> c.setStatus(ClaimStatus.REJECTED);
            case "REQUEST_INFO" -> c.setStatus(ClaimStatus.INFO_REQUESTED);
            case "SETTLE" -> {
                if (c.getStatus() != ClaimStatus.APPROVED) {
                    throw new IllegalStateException("Only approved claims can be settled");
                }
                Policy p = policies.findById(c.getPolicyId()).orElseThrow();
                p.setUsedAmount(p.getUsedAmount().add(c.getApprovedAmount()));
                policies.save(p);
                c.setStatus(ClaimStatus.SETTLED);
            }
            default -> throw new IllegalArgumentException("Unknown decision: " + decision);
        }
        c.setInsurerNote(note);
        c.setUpdatedAt(LocalDateTime.now());
        Claim saved = claims.save(c);

        notifyUser(users.findFirstByPatientId(c.getPatientId()).orElse(null),
                "Claim update",
                "Claim " + saved.getClaimNumber() + " is now " + saved.getStatus().name().replace('_', ' ').toLowerCase() + ".");
        return saved;
    }

    public void notifyUser(User user, String title, String message) {
        if (user == null) return;
        Notification n = new Notification();
        n.setUserId(user.getId());
        n.setTitle(title);
        n.setMessage(message);
        notifications.save(n);
    }
}
