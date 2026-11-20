package com.medibridge.web;

import com.medibridge.model.Claim;
import com.medibridge.model.Hospital;
import com.medibridge.model.Insurer;
import com.medibridge.model.Visit;
import com.medibridge.repository.ClaimRepository;
import com.medibridge.repository.HospitalRepository;
import com.medibridge.repository.InsurerRepository;
import com.medibridge.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final HospitalRepository hospitals;
    private final InsurerRepository insurers;
    private final VisitRepository visits;
    private final ClaimRepository claims;

    @GetMapping("/hospitals")
    public List<Hospital> hospitals(@RequestParam(required = false) String city) {
        return city == null || city.isBlank() ? hospitals.findAll() : hospitals.findByCityContainingIgnoreCase(city.trim());
    }

    @GetMapping("/insurers")
    public List<Insurer> insurers() {
        return insurers.findAll();
    }

    /** Universal Healthcare Transaction ID tracker: anyone with the UHT ID can see the visit journey summary. */
    @GetMapping("/track/{uhtId}")
    public ResponseEntity<?> track(@PathVariable String uhtId) {
        Visit v = visits.findByUhtId(uhtId.trim().toUpperCase()).orElse(null);
        if (v == null) return ResponseEntity.status(404).body(Map.of("error", "No visit found for this UHT ID"));

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("uhtId", v.getUhtId());
        m.put("status", v.getStatus());
        m.put("admittedAt", v.getAdmittedAt());
        m.put("dischargedAt", v.getDischargedAt());
        m.put("preAuthStatus", v.getPreAuthStatus());
        m.put("preAuthAmount", v.getPreAuthAmount());
        m.put("estimatedBill", v.getEstimatedBill());
        m.put("finalBill", v.getFinalBill());
        m.put("hospital", v.getHospitalId() == null ? null
                : hospitals.findById(v.getHospitalId()).map(Hospital::getName).orElse("Unknown hospital"));
        m.put("claims", claims.findByVisitId(v.getId()).stream()
                .map((Claim c) -> Map.<String, Object>of("claimNumber", c.getClaimNumber(), "status", c.getStatus().name()))
                .toList());
        return ResponseEntity.ok(m);
    }

    @PostMapping("/contact")
    public Map<String, String> contact(@RequestBody Map<String, String> body) {
        log.info("Contact request from {} <{}>", body.get("name"), body.get("email"));
        return Map.of("message", "Thanks! Our support team will get back to you within one business day.");
    }
}
