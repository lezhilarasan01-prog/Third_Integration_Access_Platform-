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
        String detectedFormat = responseExchange.getMessage().getHeader("DetectedFormat", String.class);
        String json = responseExchange.getMessage().getBody(String.class);

        List<Map<String, Object>> records = normalizeToRecords(json);
        return new TransformationResult(detectedFormat, json, records);
    }

    /**
     * Auto-converts any incoming file format directly to JSON via Apache Camel.
     */
    public String autoConvertToJson(byte[] payload, String filename) {
        TransformationResult result = unmarshalAuto(payload, filename);
        if (result.records() != null && !result.records().isEmpty()) {
            try {
                return objectMapper.writeValueAsString(result.records());
            } catch (Exception ignored) {
            }
        }
        return result.json();
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
    private List<Map<String, Object>> normalizeToRecords(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }

        try {
            Object parsed = objectMapper.readValue(json, Object.class);

            // Case 1: JSON array of objects
            if (parsed instanceof List<?> list && !list.isEmpty()) {
                if (list.get(0) instanceof Map) {
                    return (List<Map<String, Object>>) (List<?>) list;
                }
                // Case 2: Tabular CSV/Excel rows (Row 0 = headers, Rows 1..N = row values)
                if (list.get(0) instanceof List<?> headerRow && list.size() > 1) {
                    return mapTabularRows(headerRow, list);
                }
            }

            // Case 3: JSON or XML Object (unwraps XML root tags like <orders><order> if present)
            if (parsed instanceof Map<?, ?> map) {
                return unwrapRoot(map);
            }
        } catch (Exception e) {
            log.warn("Failed to parse Camel JSON output: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
	private List<Map<String, Object>> unwrapRoot(Map<?, ?> rootMap) {
		Map<?, ?> current = rootMap;
		while (current.size() == 1) {
			Object val = current.values().iterator().next();
			if (val instanceof List<?> innerList) {
				return innerList.stream().filter(Map.class::isInstance).map(m -> (Map<String, Object>) m).toList();
			} else if (val instanceof Map<?, ?> innerMap) {
				current = innerMap;
			} else {
				break;
			}
		}
		return List.of((Map<String, Object>) current);
	}

    private List<Map<String, Object>> mapTabularRows(List<?> headerRow, List<?> list) {
        List<String> headers = headerRow.stream().map(Object::toString).toList();
        List<Map<String, Object>> mappedRecords = new ArrayList<>(list.size() - 1);
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
