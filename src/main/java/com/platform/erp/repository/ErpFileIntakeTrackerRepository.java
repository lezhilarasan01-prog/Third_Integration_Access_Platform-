package com.platform.erp.repository;

import com.platform.erp.model.ErpFileIntakeTracker;
import com.platform.erp.model.TrackerSummaryProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ErpFileIntakeTrackerRepository extends JpaRepository<ErpFileIntakeTracker, String> {

    Optional<ErpFileIntakeTracker> findByJobId(String jobId);

    Optional<ErpFileIntakeTracker> findFirstByFileChecksum(String fileChecksum);

    List<ErpFileIntakeTracker> findByOrderByReceivedAtDesc(Pageable pageable);

    List<TrackerSummaryProjection> findProjectedByOrderByReceivedAtDesc(Pageable pageable);

    List<ErpFileIntakeTracker> findByKafkaTopicOrderByReceivedAtDesc(String kafkaTopic, Pageable pageable);

    List<ErpFileIntakeTracker> findByKafkaTopicIsNotNullOrderByReceivedAtDesc(Pageable pageable);

    @Query("SELECT t FROM ErpFileIntakeTracker t WHERE t.intakeStatus IN ('FAILED', 'DUPLICATE_SKIPPED') OR t.dispatchStatus = 'FAILED' OR (t.processingErrorMessage IS NOT NULL AND t.processingErrorMessage != '') ORDER BY t.receivedAt DESC")
    List<ErpFileIntakeTracker> findDlqExceptions();

    @Query("SELECT DISTINCT t.sourceSystem FROM ErpFileIntakeTracker t WHERE t.sourceSystem IS NOT NULL AND TRIM(t.sourceSystem) != '' ORDER BY t.sourceSystem ASC")
    List<String> findDistinctSourceSystems();

    @Query("SELECT DISTINCT t.transactionType FROM ErpFileIntakeTracker t WHERE t.transactionType IS NOT NULL AND TRIM(t.transactionType) != '' ORDER BY t.transactionType ASC")
    List<String> findDistinctTransactionTypes();

    @Query("SELECT t.intakeStatus, COUNT(t) FROM ErpFileIntakeTracker t GROUP BY t.intakeStatus")
    List<Object[]> countGroupedByStatus();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM ErpFileIntakeTracker t WHERE LOWER(t.sourceSystem) IN ('files', 'ingest', 'raw')")
    int cleanupInvalidSourceTrackers();
}
