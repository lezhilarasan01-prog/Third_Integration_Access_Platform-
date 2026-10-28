package com.platform.erp.transformer;

import org.apache.camel.CamelContext;
import org.apache.camel.Exchange;
import org.apache.camel.builder.RouteBuilder;
import org.apache.tika.Tika;
import org.apache.tika.io.TikaInputStream;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Enterprise Apache Camel Orchestrator.
 *
 * Clean Architecture:
 * 1. Routing & Orchestration: Apache Camel
 * 2. Excel Processing: Pure Apache POI (ExcelParser)
 * 3. EDI Processing: Dedicated ANSI ASC X12 (EdiParser)
 * 4. Standard Formats: Camel Native DataFormats (CSV, JSON, XML, YAML)
 * 5. Downstream Target: Common JSON Structure matching MAWM API Schema { "Data": [ ... ] }
 */
@Component
public class TransformationRoutes extends RouteBuilder {

    public static final String DIRECT_UNMARSHAL_AUTO = "direct:unmarshal-auto";
    public static final String DIRECT_HM_ASN_TO_MAWM = "direct:hm-asn-to-mawm";

    private final CamelDataFormatRegistry registry;
    private final FlatFileParser flatFileParser;
    private final EdiParser ediParser;
    private final HmAsnToMawmMapper hmAsnToMawmMapper;

    public TransformationRoutes() {
        this(new CamelDataFormatRegistry(new ExcelParser(), new EdiParser(), new FlatFileParser()), new FlatFileParser(), new EdiParser(), new HmAsnToMawmMapper());
    }

    @Autowired
    public TransformationRoutes(CamelDataFormatRegistry registry, FlatFileParser flatFileParser, EdiParser ediParser, HmAsnToMawmMapper hmAsnToMawmMapper) {
        this.registry = registry;
        this.flatFileParser = flatFileParser;
        this.ediParser = ediParser;
        this.hmAsnToMawmMapper = hmAsnToMawmMapper;
    }

    @Override
    public void configure() throws Exception {
        from(DIRECT_UNMARSHAL_AUTO)
                .routeId("camel-orchestrator-route")
                .process(this::orchestrateIntake)
                .marshal().json()
                .convertBodyTo(String.class);

        from(DIRECT_HM_ASN_TO_MAWM)
                .routeId("hm-asn-to-mawm-route")
                .bean(hmAsnToMawmMapper, "transformJson")
                .convertBodyTo(String.class);
    }

    private void orchestrateIntake(Exchange exchange) throws Exception {
        String filename = exchange.getMessage().getHeader("CamelFileName", String.class);
        byte[] payload = exchange.getMessage().getBody(byte[].class);

        // Guard: Reject files without a valid extension
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("File extension is mandatory. No filename was provided.");
        }
        String cleanFilename = filename.replace("\\", "/");
        if (cleanFilename.contains("/")) {
            cleanFilename = cleanFilename.substring(cleanFilename.lastIndexOf('/') + 1).trim();
        }
        int dotIdx = cleanFilename.lastIndexOf('.');
        if (dotIdx <= 0 || dotIdx == cleanFilename.length() - 1) {
            throw new IllegalArgumentException("File extension is mandatory. Files without an extension (received: '" + filename + "') are not supported.");
        }

        CamelContext context = exchange.getContext();
        String mimeType = detectMimeType(filename, payload);

        // Dynamic registry resolution: ZERO if-else statements
        CamelDataFormatRegistry.FormatRoute route = registry.resolve(mimeType);
        String detectedFormat;
        Object result;

        // Check if incoming payload is an H&M Inbound Delivery message
        String sample = (payload != null && payload.length > 0)
                ? new String(payload, 0, Math.min(payload.length, 1024), StandardCharsets.UTF_8).trim() : "";

        if (route != null && !"PLAIN".equalsIgnoreCase(route.formatName()) && !"OCTET-STREAM".equalsIgnoreCase(route.formatName())) {
            detectedFormat = route.formatName();
            result = route.unmarshaler().unmarshal(context, payload, filename);
        } else {
            // Text or binary fallback probe
            if (sample.startsWith("ISA")) {
                detectedFormat = "X12";
                result = ediParser.parse(payload);
            } else if (isTextContent(payload)) {
                detectedFormat = "FLAT";
                result = flatFileParser.parse(payload, filename);
            } else {
                detectedFormat = extractExtensionOrFallback(filename);
                result = List.of(CamelDataFormatRegistry.createBinaryRecord(detectedFormat, filename, payload));
            }
        }

        exchange.getMessage().setHeader("DetectedFormat", detectedFormat);
        exchange.getMessage().setBody(result);
    }

    private String detectMimeType(String filename, byte[] payload) {
        if (payload == null || payload.length == 0) {
            return "text/plain";
        }
        try {
            Tika tika = new org.apache.tika.Tika();
            Metadata metadata = new Metadata();
            if (filename != null && !filename.isBlank()) {
                metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, filename);
            }
            try (TikaInputStream tis = TikaInputStream.get(payload)) {
                String detected = tika.detect(tis, metadata);
                if (detected != null && !detected.isBlank()) {
                    return detected.toLowerCase();
                }
            }
        } catch (Exception ignored) {
        }
        return "application/octet-stream";
    }

    private String extractExtensionOrFallback(String filename) {
        if (filename != null && filename.contains(".")) {
            String cleanName = filename.replace("\\", "/");
            if (cleanName.contains("/")) {
                cleanName = cleanName.substring(cleanName.lastIndexOf('/') + 1).trim();
            }
            int dotIndex = cleanName.lastIndexOf('.');
            if (dotIndex > 0 && dotIndex < cleanName.length() - 1) {
                String ext = cleanName.substring(dotIndex + 1).trim().toUpperCase();
                if (!ext.isBlank()) {
                    return ext;
                }
            }
        }
        throw new IllegalArgumentException("File extension is mandatory. Files without an extension (received: '" + (filename != null ? filename : "none") + "') are not supported.");
    }

    private boolean isTextContent(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return false;
        int checkLen = Math.min(bytes.length, 512);
        int printable = 0;
        for (int i = 0; i < checkLen; i++) {
            byte b = bytes[i];
            if (b == 0x00) return false;
            if ((b >= 0x20 && b <= 0x7E) || b == '\n' || b == '\r' || b == '\t') {
                printable++;
            }
        }
        return ((double) printable / checkLen) >= 0.85;
    }
}
