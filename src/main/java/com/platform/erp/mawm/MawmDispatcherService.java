package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.store.TransactionStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class MawmDispatcherService {

    private static final Logger log = LoggerFactory.getLogger(MawmDispatcherService.class);

    private final MawmProperties mawmProperties;
    private final TransactionStore transactionStore;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public MawmDispatcherService(MawmProperties mawmProperties,
                                 TransactionStore transactionStore,
                                 ObjectMapper objectMapper) {
        this.mawmProperties = mawmProperties;
        this.transactionStore = transactionStore;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public void dispatch(CanonicalEnvelope envelope) {
        if (envelope == null) return;
        String trackingId = envelope.getTrackingId();

        if (!mawmProperties.isEnabled()) {
            log.info("[MAWM Dispatcher] MAWM client is currently paused (mawm.client.enabled=false). " +
                    "Converted JSON for TrackingId: {} is saved and ready for live cloud endpoint.", trackingId);
            transactionStore.recordMawmStatus(trackingId, "SAVED_AWAITING_ENDPOINT");
            return;
        }

        String targetEndpoint = mawmProperties.getBaseUrl() +
                ("ASN".equalsIgnoreCase(envelope.getDocumentType()) ? mawmProperties.getAsnPath() : mawmProperties.getPoPath());

        try {
            String jsonPayload = envelope.toMawmJson(objectMapper);
            log.info("[MAWM Dispatcher] Dispatching converted JSON to MAWM Cloud Endpoint: {} (TrackingId: {})",
                    targetEndpoint, trackingId);

            var requestSpec = restClient.post()
                    .uri(targetEndpoint)
                    .contentType(MediaType.APPLICATION_JSON);

            if (mawmProperties.getApiKey() != null && !mawmProperties.getApiKey().isBlank()) {
                requestSpec.header("Authorization", "Bearer " + mawmProperties.getApiKey());
            }

            var response = requestSpec.body(jsonPayload).retrieve().toBodilessEntity();

            log.info("[MAWM Dispatcher] MAWM Cloud acknowledged receipt. Status: {}, TrackingId: {}",
                    response.getStatusCode(), trackingId);
            transactionStore.recordMawmStatus(trackingId, "DELIVERED_TO_MAWM (" + response.getStatusCode() + ")");

        } catch (Exception ex) {
            log.error("[MAWM Dispatcher] Failed delivering JSON to MAWM endpoint {}: {}", targetEndpoint, ex.getMessage());
            transactionStore.recordMawmStatus(trackingId, "DISPATCH_FAILED: " + ex.getMessage());
        }
    }
}
