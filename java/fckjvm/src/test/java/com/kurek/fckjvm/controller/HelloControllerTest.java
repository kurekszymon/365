package com.kurek.fckjvm.controller;

import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kurek.fckjvm.service.HelloService;

// @WebMvcTest = web layer only, HelloService mocked.
// OAuth2 auto-config excluded — can't wire in a @WebMvcTest slice.
@WebMvcTest(HelloController.class)
@WithMockUser
@TestPropertySource(properties
        = "spring.autoconfigure.exclude=org.springframework.boot.security.oauth2.server.resource.autoconfigure.servlet.OAuth2ResourceServerAutoConfiguration"
)
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
