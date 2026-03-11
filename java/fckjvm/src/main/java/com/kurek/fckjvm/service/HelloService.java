package com.kurek.fckjvm.service;

import org.springframework.stereotype.Service;

@Service
public class HelloService {

    public String greet(String name) {
        System.out.println("Computing greeting for: " + name);
        return String.format("Hello %s!", name);
    }
}
