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
    private String asnSearchPath = "/receiving/api/receiving/asn/search";
    private String poPath = "/receiving/api/receiving/purchaseOrder/save";
    private String poSearchPath = "/receiving/api/receiving/purchaseOrder/search";
    private String poLineSearchPath = "/receiving/api/receiving/purchaseOrderLine/search";
    private String asnLineSearchPath = "/receiving/api/receiving/asnLine/search";
    private String itemPath = "/item-master/api/item-master/item/save";
    private String itemQueryPath = "/item-master/api/item-master/item";
    private String doGetPath = "/dcorder/api/dcorder/order/orderId/";
    private String doSavePath = "/dcorder/api/dcorder/order";
    private String doUpdatePath = "/dcorder/api/dcorder/order/";
    private String doSearchPath = "/dcorder/api/dcorder/order/search";
    private String doLineSearchPath = "/dcorder/api/dcorder/orderLine/search";
    private String batchPath = "/dcinventory/api/dcinventory/batchMaster/save";
    private String batchSearchPath = "/dcinventory/api/dcinventory/batchMaster/search";
    private String defaultFacility;
    private String apiKey;
    private String verifiedStatus = "8000";

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

    public String getAsnSearchPath() { return asnSearchPath; }
    public void setAsnSearchPath(String asnSearchPath) { this.asnSearchPath = asnSearchPath; }

    public String getPoPath() { return poPath; }
    public void setPoPath(String poPath) { this.poPath = poPath; }

    public String getPoSearchPath() { return poSearchPath; }
    public void setPoSearchPath(String poSearchPath) { this.poSearchPath = poSearchPath; }

    public String getPoLineSearchPath() { return poLineSearchPath; }
    public void setPoLineSearchPath(String poLineSearchPath) { this.poLineSearchPath = poLineSearchPath; }

    public String getAsnLineSearchPath() { return asnLineSearchPath; }
    public void setAsnLineSearchPath(String asnLineSearchPath) { this.asnLineSearchPath = asnLineSearchPath; }

    public String getItemPath() { return itemPath; }
    public void setItemPath(String itemPath) { this.itemPath = itemPath; }

    public String getItemQueryPath() { return itemQueryPath; }
    public void setItemQueryPath(String itemQueryPath) { this.itemQueryPath = itemQueryPath; }

    public String getDoGetPath() { return doGetPath; }
    public void setDoGetPath(String doGetPath) { this.doGetPath = doGetPath; }

    public String getDoSavePath() { return doSavePath; }
    public void setDoSavePath(String doSavePath) { this.doSavePath = doSavePath; }

    public String getDoUpdatePath() { return doUpdatePath; }
    public void setDoUpdatePath(String doUpdatePath) { this.doUpdatePath = doUpdatePath; }

    public String getDoSearchPath() { return doSearchPath; }
    public void setDoSearchPath(String doSearchPath) { this.doSearchPath = doSearchPath; }

    public String getDoLineSearchPath() { return doLineSearchPath; }
    public void setDoLineSearchPath(String doLineSearchPath) { this.doLineSearchPath = doLineSearchPath; }

    public String getBatchPath() { return batchPath; }
    public void setBatchPath(String batchPath) { this.batchPath = batchPath; }

    public String getBatchSearchPath() { return batchSearchPath; }
    public void setBatchSearchPath(String batchSearchPath) { this.batchSearchPath = batchSearchPath; }

    public String getDefaultFacility() { return defaultFacility; }
    public void setDefaultFacility(String defaultFacility) { this.defaultFacility = defaultFacility; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getVerifiedStatus() { return verifiedStatus; }
    public void setVerifiedStatus(String verifiedStatus) { this.verifiedStatus = verifiedStatus; }
}
