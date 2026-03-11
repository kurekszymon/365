package com.kurek.fckjvm.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kurek.fckjvm.service.HelloService;

// Sliced test — only loads the web layer, not the full app.
// HelloService is mocked so we test ONLY the controller's behavior.
@WebMvcTest(HelloController.class)
class HelloControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HelloService helloService;

    @Test
    void helloWithDefaultName() throws Exception {
        when(helloService.greet("World")).thenReturn("Hello World!");

        mockMvc.perform(get("/hello"))
                .andExpect(status().isOk())
                .andExpect(content().string("Hello World!"));
    }

    @Test
    void helloWithCustomName() throws Exception {
        when(helloService.greet("Bob")).thenReturn("Hello Bob!");

        mockMvc.perform(get("/hello").param("name", "Bob"))
                .andExpect(status().isOk())
                .andExpect(content().string("Hello Bob!"));
    }
}
