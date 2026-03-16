package com.kurek.fckjvm.recording.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.kurek.fckjvm.recording.service.SessionNotFoundException;

@RestControllerAdvice(basePackageClasses = SessionRecordingController.class)
public class RecordingExceptionHandler {

    @ExceptionHandler(SessionNotFoundException.class)
    public ProblemDetail handleNotFound(SessionNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
}
