package com.medibridge.service;

import com.medibridge.model.*;
import com.medibridge.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Loads realistic demo data on first start (only when the user table is empty).
 * Demo password for every account: Demo@123
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PatientRepository patients;
    private final HospitalRepository hospitals;
    private final InsurerRepository insurers;
    private final PolicyRepository policies;
    private final VisitRepository visits;
    private final ClaimRepository claims;
    private final NotificationRepository notifications;
    private final PasswordEncoder encoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;

        Insurer shield = insurer("Shield Health Insurance", "SHI", 98.2, 4.6);
        insurer("Vantage Mediclaim", "VMC", 96.5, 4.2);
        insurer("Nova Life Assurance", "NLA", 94.1, 4.0);

        Hospital citycare = hospital("CityCare Multispeciality Hospital", "Bhubaneswar", "Odisha", 4.7, 350,
                "Cardiology, Oncology, Orthopedics", "+91 674 000 1001", true);
        hospital("Lotus Heart Institute", "Hyderabad", "Telangana", 4.8, 220,
                "Cardiac Surgery, Cardiology", "+91 40 000 2002", true);
        Hospital greenfield = hospital("Greenfield General Hospital", "Pune", "Maharashtra", 4.4, 500,
                "General Medicine, Neurology, Maternity", "+91 20 000 3003", true);
        hospital("Sunrise Care Hospital", "Berhampur", "Odisha", 4.2, 180,
                "General Surgery, Pediatrics", "+91 680 000 4004", false);

        Patient rahul = patient("MB-P-000101", "Rahul Sharma", "+91 98765 43210", "rahul.sharma@example.com",
                LocalDate.of(1988, 4, 12), "Male", "B+", "Bhubaneswar");
        Patient priya = patient("MB-P-000102", "Priya Nair", "+91 91234 56789", "priya.nair@example.com",
                LocalDate.of(1994, 9, 2), "Female", "O+", "Pune");

        account("patient@medibridge.in", Role.PATIENT, "Rahul Sharma", rahul.getId(), null, null);
        account("hospital@medibridge.in", Role.HOSPITAL, "CityCare Admissions", null, citycare.getId(), null);
        account("insurer@medibridge.in", Role.INSURER, "Shield Claims Desk", null, null, shield.getId());
        account("admin@medibridge.in", Role.ADMIN, "Platform Administrator", null, null, null);

        Policy rahulPolicy = policy("SHI-FF-778812", rahul, shield, "Shield Family Floater Plus", 500000, 85000);
        Policy priyaPolicy = policy("SHI-IND-120457", priya, shield, "Shield Individual Care", 300000, 0);

        // Completed visit with a settled claim
        Visit dengue = visit(rahul, citycare, rahulPolicy, "Dengue fever", 85000, 85000L, "DISCHARGED", "APPROVED", 85000);
        Claim settled = new Claim();
        settled.setClaimNumber("CLM-A1B2C3D4");
        settled.setUhtId(dengue.getUhtId());
        settled.setVisitId(dengue.getId());
        settled.setPatientId(rahul.getId());
        settled.setHospitalId(citycare.getId());
        settled.setInsurerId(shield.getId());
        settled.setPolicyId(rahulPolicy.getId());
        settled.setClaimedAmount(BigDecimal.valueOf(85000));
        settled.setApprovedAmount(BigDecimal.valueOf(85000));
        settled.setStatus(ClaimStatus.SETTLED);
        settled.setDescription("Inpatient treatment for dengue fever, 6 days");
        claims.save(settled);

        // Ongoing admission with a pre-authorization approved
        visit(rahul, citycare, rahulPolicy, "Acute appendicitis", 120000, null, "ADMITTED", "APPROVED", 120000);

        // Discharged visit whose bill exceeds coverage -> fraud-risk alert for human investigation
        Visit cardiac = visit(priya, greenfield, priyaPolicy, "Coronary angioplasty", 350000, 350000L, "DISCHARGED", "PENDING_REVIEW", 300000);
        Claim flagged = new Claim();
        flagged.setClaimNumber("CLM-7F3E9A21");
        flagged.setUhtId(cardiac.getUhtId());
        flagged.setVisitId(cardiac.getId());
        flagged.setPatientId(priya.getId());
        flagged.setHospitalId(greenfield.getId());
        flagged.setInsurerId(shield.getId());
        flagged.setPolicyId(priyaPolicy.getId());
        flagged.setClaimedAmount(BigDecimal.valueOf(350000));
        flagged.setStatus(ClaimStatus.SUBMITTED);
        flagged.setFraudRisk(true);
        flagged.setFraudReason("Claimed amount exceeds remaining coverage; High-value claim requires human verification");
        flagged.setDescription("Elective angioplasty with two stents");
        claims.save(flagged);

        notification(rahul, "Claim settled", "Claim CLM-A1B2C3D4 for ₹85,000 has been settled.");
        notification(rahul, "Pre-authorization approved", "Your admission at CityCare is covered within your plan limits.");
    }

    private Insurer insurer(String name, String code, double csr, double rating) {
        Insurer i = new Insurer();
        i.setName(name);
        i.setCode(code);
        i.setClaimSettlementRatio(csr);
        i.setRating(rating);
        i.setPhone("1800-" + code + "-000");
        i.setEmail("support@" + code.toLowerCase() + ".example.com");
        return insurers.save(i);
    }

    private Hospital hospital(String name, String city, String state, double rating, int beds,
                              String specialties, String phone, boolean emergency) {
        Hospital h = new Hospital();
        h.setName(name);
        h.setCity(city);
        h.setState(state);
        h.setRating(rating);
        h.setBeds(beds);
        h.setSpecialties(specialties);
        h.setPhone(phone);
        h.setEmergency(emergency);
        return hospitals.save(h);
    }

    private Patient patient(String code, String name, String phone, String email, LocalDate dob,
                            String gender, String blood, String city) {
        Patient p = new Patient();
        p.setPatientCode(code);
        p.setFullName(name);
        p.setPhone(phone);
        p.setEmail(email);
        p.setDateOfBirth(dob);
        p.setGender(gender);
        p.setBloodGroup(blood);
        p.setCity(city);
        return patients.save(p);
    }

    private void account(String email, Role role, String name, Long patientId, Long hospitalId, Long insurerId) {
        User u = new User();
        u.setEmail(email);
        u.setPassword(encoder.encode("Demo@123"));
        u.setRole(role);
        u.setFullName(name);
        u.setPatientId(patientId);
        u.setHospitalId(hospitalId);
        u.setInsurerId(insurerId);
        users.save(u);
    }

    private Policy policy(String number, Patient p, Insurer i, String plan, long sumInsured, long used) {
        Policy pol = new Policy();
        pol.setPolicyNumber(number);
        pol.setPatientId(p.getId());
        pol.setInsurerId(i.getId());
        pol.setPlanName(plan);
        pol.setSumInsured(BigDecimal.valueOf(sumInsured));
        pol.setUsedAmount(BigDecimal.valueOf(used));
        pol.setValidFrom(LocalDate.now().minusMonths(4));
        pol.setValidTo(LocalDate.now().plusMonths(8));
        return policies.save(pol);
    }

    private Visit visit(Patient p, Hospital h, Policy pol, String diagnosis, long estimate, Long finalBill,
                        String status, String preAuth, long preAuthAmount) {
        Visit v = new Visit();
        v.setUhtId(Visit.newUhtId());
        v.setPatientId(p.getId());
        v.setHospitalId(h.getId());
        v.setPolicyId(pol.getId());
        v.setDiagnosis(diagnosis);
        v.setWard("General Ward");
        v.setEstimatedBill(BigDecimal.valueOf(estimate));
        v.setFinalBill(finalBill == null ? null : BigDecimal.valueOf(finalBill));
        v.setStatus(status);
        v.setPreAuthStatus(preAuth);
        v.setPreAuthAmount(BigDecimal.valueOf(preAuthAmount));
        if ("DISCHARGED".equals(status)) v.setDischargedAt(java.time.LocalDateTime.now().minusDays(2));
        return visits.save(v);
    }

    private void notification(Patient p, String title, String message) {
        User u = users.findFirstByPatientId(p.getId()).orElse(null);
        if (u == null) return;
        Notification n = new Notification();
        n.setUserId(u.getId());
        n.setTitle(title);
        n.setMessage(message);
        notifications.save(n);
    }
}
