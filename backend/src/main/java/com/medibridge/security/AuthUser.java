package com.medibridge.security;

/** The authenticated principal, rebuilt from the JWT on every request (no database hit). */
public record AuthUser(
        Long id,
        String email,
        String role,
        Long patientId,
        Long hospitalId,
        Long insurerId,
        String name) {
}
