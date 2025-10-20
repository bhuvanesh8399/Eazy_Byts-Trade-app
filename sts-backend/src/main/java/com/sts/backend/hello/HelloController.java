package com.sts.backend.hello;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    // show active profile in response; default to "default" if none
    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @GetMapping("/api/hello")
    public Map<String, Object> hello() {
        return Map.of(
                "message", "STS backend is up 🚀",
                "env", activeProfile
        );
    }

    // simple plain-text probe (in case JSON blows up)
    @GetMapping("/api/hello/plain")
    public String helloPlain() {
        return "STS backend is up (env=" + activeProfile + ")";
    }
}
