package com.kurek.fckjvm.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

// Plain unit test — no Spring context needed. Fast.
class HelloServiceTest {

    private final HelloService helloService = new HelloService();

    @Test
    void greetReturnsFormattedMessage() {
        assertEquals("Hello Alice!", helloService.greet("Alice"));
    }

    @Test
    void greetWithEmptyString() {
        assertEquals("Hello !", helloService.greet(""));
    }
}
