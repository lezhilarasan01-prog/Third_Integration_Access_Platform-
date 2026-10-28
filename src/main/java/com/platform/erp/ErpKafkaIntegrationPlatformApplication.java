package com.platform.erp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.kafka.annotation.EnableKafka;

@SpringBootApplication
@EnableKafka
@ConfigurationPropertiesScan
public class ErpKafkaIntegrationPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(ErpKafkaIntegrationPlatformApplication.class, args);
    }
}
