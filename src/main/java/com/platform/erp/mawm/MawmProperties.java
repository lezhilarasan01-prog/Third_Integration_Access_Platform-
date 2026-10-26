package com.platform.erp.mawm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "mawm.client")
public class MawmProperties {
    private boolean enabled = false;
    private String baseUrl = "http://localhost:8080/api/v1/mock-mawm";
    private String asnPath = "/shipments/asn";
    private String poPath = "/orders/po";
    private String apiKey = "";

    public MawmProperties() {}

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getAsnPath() { return asnPath; }
    public void setAsnPath(String asnPath) { this.asnPath = asnPath; }

    public String getPoPath() { return poPath; }
    public void setPoPath(String poPath) { this.poPath = poPath; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
}
