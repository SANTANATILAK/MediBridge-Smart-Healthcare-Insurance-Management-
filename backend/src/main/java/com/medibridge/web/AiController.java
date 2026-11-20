package com.medibridge.web;

import com.medibridge.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/** Authenticated proxy to the Python AI service. Only allow-listed actions are forwarded. */
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private static final Set<String> ACTIONS = Set.of("chat", "explain-policy", "claim-readiness", "analyze-document");

    @Value("${app.ai.base-url}")
    private String aiBaseUrl;

    @PostMapping("/{action}")
    public ResponseEntity<?> proxy(@PathVariable String action,
                                   @AuthenticationPrincipal AuthUser me,
                                   @RequestBody Map<String, Object> body) {
        if (!ACTIONS.contains(action)) {
            return ResponseEntity.status(404).body(Map.of("error", "Unknown AI action"));
        }
        Map<String, Object> payload = new HashMap<>(body);
        payload.put("role", me.role());
        try {
            Map<?, ?> result = RestClient.create(aiBaseUrl).post()
                    .uri("/" + action)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);
            return ResponseEntity.ok(result);
        } catch (RestClientException ex) {
            return ResponseEntity.status(503).body(Map.of("error", "The AI service is unavailable right now"));
        }
    }
}
