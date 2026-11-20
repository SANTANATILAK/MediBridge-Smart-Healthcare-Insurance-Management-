package com.medibridge.web;

import com.medibridge.model.Patient;
import com.medibridge.model.Role;
import com.medibridge.model.User;
import com.medibridge.repository.PatientRepository;
import com.medibridge.repository.UserRepository;
import com.medibridge.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository users;
    private final PatientRepository patients;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public record RegisterRequest(@NotBlank String name,
                                  @NotBlank @Email String email,
                                  @NotBlank @Size(min = 6) String password,
                                  String phone) {}

    public record LoginRequest(@NotBlank @Email String email,
                               @NotBlank String password,
                               String portal) {}

    /** Self-service registration for patients. Hospitals and insurers are onboarded by the super admin. */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "This email is already registered"));
        }
        Patient p = new Patient();
        p.setPatientCode(String.format("MB-P-%06d", ThreadLocalRandom.current().nextInt(1_000_000)));
        p.setFullName(r.name());
        p.setEmail(email);
        p.setPhone(r.phone());
        patients.save(p);

        User u = new User();
        u.setEmail(email);
        u.setPassword(encoder.encode(r.password()));
        u.setRole(Role.PATIENT);
        u.setFullName(r.name());
        u.setPhone(r.phone());
        u.setPatientId(p.getId());
        users.save(u);
        return ResponseEntity.status(201).body(authResponse(u));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest r) {
        User u = users.findByEmailIgnoreCase(r.email().trim()).orElse(null);
        if (u == null || !encoder.matches(r.password(), u.getPassword()) || !u.isActive()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }
        if (r.portal() != null && !r.portal().isBlank() && !r.portal().equalsIgnoreCase(u.getRole().name())) {
            return ResponseEntity.status(403).body(Map.of("error",
                    "This account does not belong to the " + r.portal().toLowerCase() + " portal"));
        }
        return ResponseEntity.ok(authResponse(u));
    }

    private Map<String, Object> authResponse(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("token", jwt.generate(u));
        m.put("user", Views.user(u));
        return m;
    }
}
