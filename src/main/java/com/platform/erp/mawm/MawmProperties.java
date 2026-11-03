package com.platform.erp.mawm;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Manhattan Active WMS (MAWM) integration.
 * All values are bound dynamically from application.properties (prefix: mawm.client).
 */
@Configuration
@ConfigurationProperties(prefix = "mawm.client")
public class MawmProperties {
    private boolean enabled;
    private String authUrl;
    private String basicAuth;
    private String username;
    private String password;
    private String baseUrl;
    private String asnPath;
    private String poPath;
    private String defaultFacility;
    private String apiKey;

    public MawmProperties() {}

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getAuthUrl() { return authUrl; }
    public void setAuthUrl(String authUrl) { this.authUrl = authUrl; }

    public String getBasicAuth() { return basicAuth; }
    public void setBasicAuth(String basicAuth) { this.basicAuth = basicAuth; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getAsnPath() { return asnPath; }
    public void setAsnPath(String asnPath) { this.asnPath = asnPath; }

    public String getPoPath() { return poPath; }
    public void setPoPath(String poPath) { this.poPath = poPath; }

    public String getDefaultFacility() { return defaultFacility; }
    public void setDefaultFacility(String defaultFacility) { this.defaultFacility = defaultFacility; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
}
