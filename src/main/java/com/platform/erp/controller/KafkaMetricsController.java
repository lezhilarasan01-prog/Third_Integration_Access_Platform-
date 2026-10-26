package com.platform.erp.controller;

import org.apache.kafka.common.TopicPartition;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.config.KafkaListenerEndpointRegistry;
import org.springframework.kafka.listener.ConcurrentMessageListenerContainer;
import org.springframework.kafka.listener.MessageListenerContainer;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/**
 * Controller to provide real-time visibility into Kafka topic partitions,
 * active consumer threads, and partition assignments.
 */
@RestController
@RequestMapping("/api/v1/erp/metrics")
public class KafkaMetricsController {

    private final KafkaListenerEndpointRegistry registry;

    public KafkaMetricsController(KafkaListenerEndpointRegistry registry) {
        this.registry = registry;
    }

    /**
     * Endpoint to view running consumers and their assigned topic partitions.
     * Example: GET http://localhost:8080/api/v1/erp/metrics/kafka
     */
    @GetMapping("/kafka")
    public ResponseEntity<Map<String, Object>> getKafkaConsumerMetrics() {
        Map<String, Object> response = new LinkedHashMap<>();
        List<Map<String, Object>> containerDetails = new ArrayList<>();
        int totalActiveThreads = 0;
        int totalAssignedPartitions = 0;

        for (MessageListenerContainer container : registry.getListenerContainers()) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("listenerId", container.getListenerId());
            details.put("groupId", container.getGroupId());
            details.put("isRunning", container.isRunning());

            if (container instanceof ConcurrentMessageListenerContainer<?, ?> concurrentContainer) {
                details.put("concurrency", concurrentContainer.getConcurrency());
                List<Map<String, Object>> threadDetails = new ArrayList<>();
                for (MessageListenerContainer child : concurrentContainer.getContainers()) {
                    Map<String, Object> threadInfo = new LinkedHashMap<>();
                    threadInfo.put("threadListenerId", child.getListenerId());
                    Collection<TopicPartition> threadPartitions = child.getAssignedPartitions();
                    List<String> threadPartList = new ArrayList<>();
                    if (threadPartitions != null) {
                        for (TopicPartition tp : threadPartitions) {
                            threadPartList.add(tp.topic() + " - Partition #" + tp.partition());
                        }
                    }
                    threadInfo.put("assignedPartitions", threadPartList);
                    threadDetails.add(threadInfo);
                    totalActiveThreads++;
                }
                details.put("workerThreads", threadDetails);
            }

            Collection<TopicPartition> partitions = container.getAssignedPartitions();
            List<String> partitionList = new ArrayList<>();
            if (partitions != null) {
                for (TopicPartition tp : partitions) {
                    partitionList.add(tp.topic() + " - Partition #" + tp.partition());
                }
                totalAssignedPartitions += partitions.size();
            }

            details.put("totalAssignedPartitionsCount", partitionList.size());
            details.put("allAssignedPartitions", partitionList);

            containerDetails.add(details);
        }

        response.put("status", "HEALTHY");
        response.put("totalActiveConsumerThreads", totalActiveThreads);
        response.put("totalAssignedPartitions", totalAssignedPartitions);
        response.put("containers", containerDetails);

        return ResponseEntity.ok(response);
    }
}
