package com.medibridge.web;

import com.medibridge.model.Claim;
import com.medibridge.model.ClaimStatus;
import com.medibridge.model.Insurer;
import com.medibridge.repository.ClaimRepository;
import com.medibridge.repository.InsurerRepository;
import com.medibridge.security.AuthUser;
import com.medibridge.service.ClaimService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/insurer")
@RequiredArgsConstructor
public class InsurerController {

    private static final Set<ClaimStatus> OPEN = EnumSet.of(ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW, ClaimStatus.INFO_REQUESTED);

    private final InsurerRepository insurers;
    private final ClaimRepository claims;
    private final ClaimService claimService;

    /** decision: APPROVE | REJECT | REQUEST_INFO | SETTLE */
    public record DecisionRequest(@NotBlank String decision, BigDecimal approvedAmount, String note) {}

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal AuthUser me) {
        List<Claim> cs = claims.findByInsurerIdOrderByCreatedAtDesc(me.insurerId());
        Insurer insurer = insurers.findById(me.insurerId()).orElseThrow();

        Map<String, Long> byStatus = cs.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus().name(), TreeMap::new, Collectors.counting()));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", cs.size());
        stats.put("pending", cs.stream().filter(c -> OPEN.contains(c.getStatus())).count());
        stats.put("fraudAlerts", cs.stream().filter(c -> c.isFraudRisk() && OPEN.contains(c.getStatus())).count());
        stats.put("claimedValue", sum(cs.stream().map(Claim::getClaimedAmount).toList()));
        stats.put("settledValue", sum(cs.stream().filter(c -> c.getStatus() == ClaimStatus.SETTLED)
                .map(Claim::getApprovedAmount).toList()));
        stats.put("settlementRatio", insurer.getClaimSettlementRatio());
        stats.put("byStatus", byStatus);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("insurer", insurer);
        res.put("claims", cs);
        res.put("stats", stats);
        return res;
    }

    @PostMapping("/claims/{id}/decision")
    public Claim decide(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                        @Valid @RequestBody DecisionRequest r) {
        Claim c = claims.findById(id)
                .filter(x -> me.insurerId() != null && me.insurerId().equals(x.getInsurerId()))
                .orElseThrow(() -> new NoSuchElementException("Claim not found"));
        return claimService.decide(c, r.decision().trim().toUpperCase(), r.approvedAmount(), r.note());
    }

    private static BigDecimal sum(List<BigDecimal> values) {
        return values.stream().filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
