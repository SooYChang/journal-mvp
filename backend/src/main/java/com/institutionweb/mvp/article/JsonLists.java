package com.institutionweb.mvp.article;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.institutionweb.mvp.common.api.ApiException;
import java.util.List;

public final class JsonLists {
    private JsonLists() {}

    public static List<String> read(ObjectMapper mapper, String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<String> values = mapper.readValue(json, new TypeReference<List<String>>() {});
            return values == null ? List.of() : values;
        } catch (Exception ex) {
            throw ApiException.storage("Stored metadata could not be read.");
        }
    }

    public static String write(ObjectMapper mapper, List<String> values) {
        try {
            return mapper.writeValueAsString(values == null ? List.of() : values);
        } catch (Exception ex) {
            throw ApiException.validation("Unable to store list values.");
        }
    }
}
