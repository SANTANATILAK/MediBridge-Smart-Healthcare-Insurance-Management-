package com.medibridge.security;

import com.medibridge.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generate(User u) {
        Date now = new Date();
        JwtBuilder b = Jwts.builder()
                .subject(u.getEmail())
                .claim("uid", u.getId())
                .claim("role", u.getRole().name())
                .claim("name", u.getFullName() == null ? "" : u.getFullName())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs));
        if (u.getPatientId() != null) b.claim("pid", u.getPatientId());
        if (u.getHospitalId() != null) b.claim("hid", u.getHospitalId());
        if (u.getInsurerId() != null) b.claim("iid", u.getInsurerId());
        return b.signWith(key).compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
