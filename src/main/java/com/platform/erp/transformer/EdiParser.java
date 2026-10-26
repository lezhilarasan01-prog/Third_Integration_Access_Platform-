package com.platform.erp.transformer;

import io.xlate.edi.stream.EDIInputFactory;
import io.xlate.edi.stream.EDIStreamEvent;
import io.xlate.edi.stream.EDIStreamReader;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.*;

/**
 * Enterprise Standard EDI / X12 Parser powered by StAEDI (io.xlate.staedi).
 * Uses industry-standard streaming EDI event processing instead of manual string parsing.
 */
@Component("ediParser")
public class EdiParser {

    private final EDIInputFactory factory = EDIInputFactory.newFactory();

    public List<Map<String, Object>> parse(byte[] payload) throws Exception {
        if (payload == null || payload.length == 0) {
            return Collections.emptyList();
        }
        try (InputStream is = new ByteArrayInputStream(payload)) {
            return parse(is);
        }
    }

    public List<Map<String, Object>> parse(InputStream stream) throws Exception {
        EDIStreamReader reader = factory.createEDIStreamReader(stream);
        List<Map<String, Object>> records = new ArrayList<>();

        String currentTransactionSet = null;
        String currentControlNumber = null;
        Map<String, Object> currentSegment = null;
        List<String> currentElements = null;
        int elementIndex = 1;

        while (reader.hasNext()) {
            EDIStreamEvent event = reader.next();
            switch (event) {
                case START_SEGMENT -> {
                    String tag = reader.getText();
                    currentSegment = new LinkedHashMap<>();
                    currentElements = new ArrayList<>();
                    elementIndex = 1;
                    currentSegment.put("segment", tag);
                    if (currentTransactionSet != null) {
                        currentSegment.put("transactionSet", currentTransactionSet);
                        if (currentControlNumber != null && !currentControlNumber.isEmpty()) {
                            currentSegment.put("controlNumber", currentControlNumber);
                        }
                    }
                }
                case ELEMENT_DATA -> {
                    String value = reader.getText();
                    if (currentSegment != null) {
                        currentElements.add(value);
                        String idxKey = String.format("E%02d", elementIndex++);
                        currentSegment.put(idxKey, value);

                        if ("ST".equals(currentSegment.get("segment"))) {
                            if (elementIndex - 1 == 1) currentTransactionSet = value;
                            if (elementIndex - 1 == 2) currentControlNumber = value;
                            currentSegment.put("transactionSet", currentTransactionSet);
                            currentSegment.put("controlNumber", currentControlNumber);
                        }
                    }
                }
                case END_SEGMENT -> {
                    if (currentSegment != null) {
                        currentSegment.put("elements", currentElements);
                        records.add(currentSegment);
                        if ("SE".equals(currentSegment.get("segment"))) {
                            currentTransactionSet = null;
                            currentControlNumber = null;
                        }
                        currentSegment = null;
                        currentElements = null;
                    }
                }
                case END_TRANSACTION -> {
                    currentTransactionSet = null;
                    currentControlNumber = null;
                }
                default -> {
                }
            }
        }
        reader.close();
        return records;
    }
}
