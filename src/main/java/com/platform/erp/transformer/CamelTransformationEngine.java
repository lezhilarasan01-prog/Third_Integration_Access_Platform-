package com.platform.erp.transformer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.camel.CamelContext;
import org.apache.camel.Exchange;
import org.apache.camel.ProducerTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * 100% Dynamic Enterprise Transformation Engine powered by Apache Camel.
 * Replaces standalone detector classes with Camel's built-in Content-Based Router (CBR),
 * automatically detecting, routing, and unmarshaling ANY file format natively.
 */
@Service
public class CamelTransformationEngine {

    private static final Logger log = LoggerFactory.getLogger(CamelTransformationEngine.class);

    private final CamelContext camelContext;
    private final ProducerTemplate producerTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record TransformationResult(String detectedFormat, String json, List<Map<String, Object>> records) {
        public TransformationResult(String detectedFormat, List<Map<String, Object>> records) {
            this(detectedFormat, null, records);
        }
    }

    @Autowired
    public CamelTransformationEngine(CamelContext camelContext, ProducerTemplate producerTemplate) {
        this.camelContext = camelContext;
        this.producerTemplate = producerTemplate;
        ensureRoutesLoaded();
        log.info("Initialized Dynamic CamelTransformationEngine with CamelContext: {}", camelContext.getName());
    }

    /**
     * Constructor for standalone unit testing without Spring context.
     */
    public CamelTransformationEngine(CamelContext camelContext) {
        this(camelContext, camelContext.createProducerTemplate());
    }

    /**
     * 100% Native Camel Auto-Intake:
     * Delegates format detection, unmarshaling, and auto-conversion to JSON entirely to Apache Camel.
     */
    public TransformationResult unmarshalAuto(byte[] payload, String filename) {
        if (payload == null || payload.length == 0) {
            return new TransformationResult("TEXT", "[]", Collections.emptyList());
        }

        Exchange exchange = camelContext.getEndpoint(TransformationRoutes.DIRECT_UNMARSHAL_AUTO).createExchange();
        exchange.getIn().setHeader("CamelFileName", filename);
        exchange.getIn().setBody(payload);

        Exchange responseExchange = producerTemplate.send(TransformationRoutes.DIRECT_UNMARSHAL_AUTO, exchange);
        String detectedFormat = responseExchange.getMessage().getHeader("DetectedFormat", "TEXT", String.class);
        String json = responseExchange.getMessage().getBody(String.class);

        List<Map<String, Object>> records = normalizeToRecords(json);
        if (records != null && !records.isEmpty() && (json == null || json.startsWith("[["))) {
            try {
                json = objectMapper.writeValueAsString(records);
            } catch (Exception ignored) {
            }
        }
        return new TransformationResult(detectedFormat != null ? detectedFormat : "TEXT", json, records);
    }

    /**
     * Auto-converts any incoming file format directly to JSON via Apache Camel.
     */
    public String autoConvertToJson(byte[] payload, String filename) {
        return unmarshalAuto(payload, filename).json();
    }

    /**
     * Dynamic format unmarshaler: passes file to Camel's universal intake.
     */
    public List<Map<String, Object>> unmarshal(byte[] payload, String formatName, String filename) {
        return unmarshalAuto(payload, filename).records();
    }

    /**
     * Normalizes Camel auto-converted JSON output into standard List of Map records.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> normalizeToRecords(Object result) {
        if (result == null) {
            return Collections.emptyList();
        }

        try {
            if (result instanceof java.io.InputStream is) {
                result = objectMapper.readValue(is, Object.class);
            } else if (result instanceof byte[] bytes) {
                result = objectMapper.readValue(bytes, Object.class);
            } else if (result instanceof String jsonString) {
                result = objectMapper.readValue(jsonString, Object.class);
            }
        } catch (Exception e) {
            log.warn("Failed to parse Camel JSON output: {}", e.getMessage());
            return Collections.emptyList();
        }

        if (result instanceof List<?> list) {
            if (list.isEmpty()) {
                return Collections.emptyList();
            }
            if (list.get(0) instanceof Map) {
                return list.stream()
                        .filter(Map.class::isInstance)
                        .map(m -> (Map<String, Object>) m)
                        .toList();
            }
            // Tabular format representation: row 0 = headers, rows 1..N = row values
            if (list.get(0) instanceof List<?> headerRow && list.size() > 1) {
                List<String> headers = headerRow.stream().map(Object::toString).toList();
                List<Map<String, Object>> mappedRecords = new ArrayList<>();
                for (int i = 1; i < list.size(); i++) {
                    if (list.get(i) instanceof List<?> row) {
                        Map<String, Object> map = new LinkedHashMap<>();
                        for (int h = 0; h < headers.size() && h < row.size(); h++) {
                            map.put(headers.get(h), row.get(h));
                        }
                        mappedRecords.add(map);
                    }
                }
                return mappedRecords;
            }
        }

        if (result instanceof Map<?, ?> rootMap) {
            Map<?, ?> current = rootMap;
            while (current.size() == 1) {
                Object val = current.values().iterator().next();
                if (val instanceof List<?> innerList) {
                    return innerList.stream()
                            .filter(Map.class::isInstance)
                            .map(m -> (Map<String, Object>) m)
                            .toList();
                } else if (val instanceof Map<?, ?> innerMap) {
                    current = innerMap;
                } else {
                    break;
                }
            }
            return List.of((Map<String, Object>) current);
        }

        return Collections.emptyList();
    }  
    private void ensureRoutesLoaded() {
        try {
            if (camelContext.getRoute("camel-orchestrator-route") == null) {
                camelContext.addRoutes(new TransformationRoutes());
            }
            if (!camelContext.getStatus().isStarted()) {
                camelContext.start();
            }
        } catch (Exception e) {
            log.error("Failed to initialize Camel routes in CamelTransformationEngine: {}", e.getMessage(), e);
        }
    }
}
