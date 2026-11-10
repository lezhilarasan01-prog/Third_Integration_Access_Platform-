package com.platform.erp.test;

import org.junit.jupiter.api.Test;
import java.sql.*;

public class QueryDbTest {
    @Test
    void testQuery() {
        String url = "jdbc:postgresql://15.207.237.212:5432/erp_db?connectTimeout=3";
        try (Connection conn = DriverManager.getConnection(url, "erp_admin", "ErpPostgres2026!")) {
            try (PreparedStatement ps = conn.prepareStatement("SELECT job_id, facility_id, raw_content, output_files, mawm_response FROM erp_file_intake_tracker WHERE job_id = ?")) {
                ps.setString(1, "163269ba-431e-40d3-aedc-4970adcd407d");
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        System.out.println("JOB_ID: " + rs.getString("job_id"));
                        System.out.println("FACILITY_ID: " + rs.getString("facility_id"));
                        System.out.println("RAW_CONTENT: " + rs.getString("raw_content"));
                        System.out.println("OUTPUT_FILES: " + rs.getString("output_files"));
                        System.out.println("MAWM_RESPONSE: " + rs.getString("mawm_response"));
                    } else {
                        System.out.println("ROW NOT FOUND");
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("QueryDbTest note (remote DB check): " + e.getMessage());
        }
    }
}

