package com.institutionweb.mvp.journal;

public record JournalProfileUpdate(
        String name,
        String description,
        String issnOnline,
        String publisher,
        Integer foundedYear,
        String frequency,
        String aimsAndScope,
        String editorInChief,
        String editorialBoard,
        String contactEmail,
        String openAccessNote,
        String publisherFullName,
        String aboutPublisher,
        String publisherCity,
        String publisherContact,
        String membershipNote,
        String membershipEmail) {}
