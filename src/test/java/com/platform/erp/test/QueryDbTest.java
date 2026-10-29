package com.platform.erp.test;

import org.junit.jupiter.api.Test;
import java.sql.*;

public class QueryDbTest {
    @Test
    void testQuery() throws Exception {
        String url = "jdbc:postgresql://15.207.237.212:5432/erp_db";
        try (Connection conn = DriverManager.getConnection(url, "erp_admin", "ErpPostgres2026!")) {
            try (PreparedStatement ps = conn.prepareStatement("SELECT job_id, intake_status, processing_error_message, kafka_topic, error_file FROM erp_file_intake_tracker WHERE job_id = ?")) {
                ps.setString(1, "4bf320b7-44b0-4cf7-b3df-ea9d1cd787b2");
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        System.out.println("JOB_ID: " + rs.getString("job_id"));
                        System.out.println("INTAKE_STATUS: " + rs.getString("intake_status"));
                        System.out.println("ERROR_MSG: " + rs.getString("processing_error_message"));
                        System.out.println("KAFKA_TOPIC: " + rs.getString("kafka_topic"));
                        System.out.println("ERROR_FILE: " + rs.getString("error_file"));
                    } else {
                        System.out.println("ROW NOT FOUND FOR 4bf320b7-44b0-4cf7-b3df-ea9d1cd787b2");
                    }
                }
            }
        }
    }
}

