package com.platform.erp.controller;

import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

/**
 * Global Exception Handler to intercept and gracefully handle client disconnections,
 * socket resets, and aborted browser streams without flooding server logs.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Intercept client-aborted requests (e.g. browser refresh, tab closed, or Postman cancel)
     * and handle them silently at debug level rather than logging WARN stack traces.
     */
    @ExceptionHandler({
            AsyncRequestNotUsableException.class,
            ClientAbortException.class
    })
    @ResponseStatus(HttpStatus.OK)
    public void handleClientAbortException(Exception ex) {
        log.debug("[Client Disconnect] Remote client aborted the connection before response completion: {}", ex.getMessage());
    }

    /**
     * Catch socket write/pipe broken exceptions caused by client disconnection.
     */
    @ExceptionHandler(IOException.class)
    public void handleIOException(IOException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "";
        if (msg.contains("aborted by the software") || msg.contains("Broken pipe") || msg.contains("Connection reset by peer")) {
            log.debug("[Client Disconnect] Socket closed by client machine: {}", msg);
        } else {
            log.warn("[IO Notice] Unhandled IOException occurred: {}", msg);
        }
    }
}

