package com.institutionweb.mvp.member;

import com.institutionweb.mvp.common.api.PageResponse;
import com.institutionweb.mvp.member.MemberService.CreateMemberRequest;
import com.institutionweb.mvp.member.MemberService.MemberDto;
import com.institutionweb.mvp.member.MemberService.PatchMemberRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/members")
public class AdminMemberController {
    private final MemberService members;

    public AdminMemberController(MemberService members) {
        this.members = members;
    }

    @GetMapping
    public PageResponse<MemberDto> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return members.list(query, status, page, size);
    }

    @PostMapping
    public MemberDto create(@RequestBody CreateMemberRequest request) {
        return members.create(request);
    }

    @GetMapping("/{userId}")
    public MemberDto get(@PathVariable long userId) {
        return members.get(userId);
    }

    @PatchMapping("/{userId}")
    public MemberDto update(@PathVariable long userId, @RequestBody PatchMemberRequest request) {
        return members.update(userId, request);
    }

    @DeleteMapping("/{userId}")
    public Map<String, String> delete(@PathVariable long userId) {
        members.delete(userId);
        return Map.of("status", "ok");
    }
}
