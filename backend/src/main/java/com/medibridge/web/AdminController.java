package com.medibridge.web;

import com.medibridge.model.Claim;
import com.medibridge.model.User;
import com.medibridge.repository.*;
import com.medibridge.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository users;
    private final PatientRepository patients;
    private final HospitalRepository hospitals;
    private final InsurerRepository insurers;
    private final PolicyRepository policies;
    private final VisitRepository visits;
    private final ClaimRepository claims;

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        List<Claim> all = claims.findAll();

        Map<String, Object> counts = new LinkedHashMap<>();
        counts.put("users", users.count());
        counts.put("patients", patients.count());
        counts.put("hospitals", hospitals.count());
        counts.put("insurers", insurers.count());
        counts.put("policies", policies.count());
        counts.put("visits", visits.count());
        counts.put("claims", all.size());

        BigDecimal claimedValue = all.stream().map(Claim::getClaimedAmount).filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("counts", counts);
        res.put("claimedValue", claimedValue);
        res.put("fraudAlerts", all.stream().filter(Claim::isFraudRisk).count());
        res.put("claimsByStatus", all.stream()
                .collect(Collectors.groupingBy(c -> c.getStatus().name(), TreeMap::new, Collectors.counting())));
        res.put("users", users.findAll().stream().map(Views::user).toList());
        return res;
    }

    @PatchMapping("/users/{id}/toggle")
    public Map<String, Object> toggleUser(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        User u = users.findById(id).orElseThrow(() -> new NoSuchElementException("User not found"));
        if (u.getId().equals(me.id())) throw new IllegalArgumentException("You cannot deactivate your own account");
        u.setActive(!u.isActive());
        return Views.user(users.save(u));
    }
}
