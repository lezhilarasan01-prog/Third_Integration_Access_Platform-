package com.platform.erp.security;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Configuration to register the ERB Authentication Filter for inbound requests.
 */
@Configuration
public class ErbSecurityConfig {

    private final ErbAuthenticationFilter authenticationFilter;

    public ErbSecurityConfig(ErbAuthenticationFilter authenticationFilter) {
        this.authenticationFilter = authenticationFilter;
    }

    @Bean
    public FilterRegistrationBean<ErbAuthenticationFilter> erbAuthenticationFilterRegistration() {
        FilterRegistrationBean<ErbAuthenticationFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(authenticationFilter);
        registration.addUrlPatterns(
                "/api/v1/erp/*",
                "/receiving/*",
                "/dcorder/*",
                "/item-master/*",
                "/dcinventory/*",
                "/create-do-active",
                "/check-do-status-active"
        );
        registration.setName("erbAuthenticationFilter");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}

