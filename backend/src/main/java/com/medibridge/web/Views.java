package com.medibridge.web;

import com.medibridge.model.User;

import java.util.LinkedHashMap;
import java.util.Map;

/** Safe JSON views of entities (never exposes password hashes). */
public final class Views {

    private Views() {
    }

    public static Map<String, Object> user(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("role", u.getRole().name());
        m.put("name", u.getFullName());
        m.put("active", u.isActive());
        m.put("patientId", u.getPatientId());
        m.put("hospitalId", u.getHospitalId());
        m.put("insurerId", u.getInsurerId());
        return m;
    }
}
