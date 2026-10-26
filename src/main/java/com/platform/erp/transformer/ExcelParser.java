package com.platform.erp.transformer;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.*;

/**
 * Standard Apache POI Excel Reader.
 * Uses POI's built-in DataFormatter — zero switch statements or raw cell-type parsing.
 */
@Component("excelParser")
public class ExcelParser {

    private final DataFormatter formatter = new DataFormatter();

    public List<Map<String, Object>> parse(byte[] payload) throws Exception {
        if (payload == null || payload.length == 0) {
            return Collections.emptyList();
        }
        try (InputStream is = new ByteArrayInputStream(payload)) {
            return parse(is);
        }
    }

    public List<Map<String, Object>> parse(InputStream stream) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(stream)) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                return Collections.emptyList();
            }

            Iterator<Row> rowIterator = sheet.rowIterator();
            if (!rowIterator.hasNext()) {
                return Collections.emptyList();
            }

            Row headerRow = rowIterator.next();
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                String h = formatter.formatCellValue(cell).trim();
                headers.add(h.isEmpty() ? "COL_" + (headers.size() + 1) : h);
            }

            List<Map<String, Object>> records = new ArrayList<>();
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                Map<String, Object> record = new LinkedHashMap<>();
                boolean hasData = false;
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c);
                    String val = cell != null ? formatter.formatCellValue(cell).trim() : "";
                    if (!val.isEmpty()) {
                        hasData = true;
                    }
                    record.put(headers.get(c), val);
                }
                if (hasData) {
                    records.add(record);
                }
            }
            return records;
        }
    }
}
