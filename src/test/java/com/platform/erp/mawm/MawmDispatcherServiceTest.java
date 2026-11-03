package com.platform.erp.mawm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.erp.model.CanonicalEnvelope;
import com.platform.erp.store.TransactionStore;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;

class MawmDispatcherServiceTest {

    @Test
    void shouldSkipWhenEnvelopeIsNull() {
        MawmProperties properties = new MawmProperties();
        MawmAuthService authService = mock(MawmAuthService.class);
        TransactionStore transactionStore = mock(TransactionStore.class);
        ObjectMapper objectMapper = new ObjectMapper();

        MawmDispatcherService dispatcher = new MawmDispatcherService(properties, authService, transactionStore, objectMapper);
        dispatcher.dispatch(null);

        verifyNoInteractions(transactionStore);
        verifyNoInteractions(authService);
    }

    @Test
    void shouldRecordAwaitingEndpointWhenDisabled() {
        MawmProperties properties = new MawmProperties();
        properties.setEnabled(false);
        MawmAuthService authService = mock(MawmAuthService.class);
        TransactionStore transactionStore = mock(TransactionStore.class);
        ObjectMapper objectMapper = new ObjectMapper();

        MawmDispatcherService dispatcher = new MawmDispatcherService(properties, authService, transactionStore, objectMapper);

        CanonicalEnvelope envelope = new CanonicalEnvelope();
        envelope.setTrackingId("TRK-12345");
        envelope.setDocumentType("ASN");
        envelope.setFacilityId("Food_Cbe");
        envelope.setData(List.of(Map.of("AsnId", "ASN-001")));

        dispatcher.dispatch(envelope);

        verify(transactionStore, times(1)).recordMawmStatus("TRK-12345", "SAVED_AWAITING_ENDPOINT");
        verifyNoInteractions(authService);
    }
}

