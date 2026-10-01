# STEP 06 — 관리자 회원 등록과 관리

## 정책

- public signup 없음
- SOCIETY_ADMIN이 계정을 직접 등록(Register)
- 이메일 발송과 초대 token 없음
- 관리자가 temporary password를 입력
- role: `MEMBER`, `SOCIETY_ADMIN`
- status: `ACTIVE`, `SUSPENDED`, `DEACTIVATED`
- ACTIVE이고 `deleted_at IS NULL`인 사용자만 로그인 가능
- 회원 삭제는 status `DEACTIVATED`와 별개다. soft delete는 `deleted_at`을 설정하고 기본 목록에서 숨기며 로그인을 막는다. 복구 API는 만들지 않는다.

## API

모두 `SOCIETY_ADMIN` 전용이다.

### `GET /api/admin/members`

Query: `query`, `status`, `page=0`, `size=20`.

Response:

```json
{
  "content": [
    {
      "id": 2,
      "email": "member@example.com",
      "displayName": "Local Member",
      "role": "MEMBER",
      "status": "ACTIVE",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

기본 목록은 `deleted_at IS NULL`만 포함한다. query는 email과 displayName case-insensitive 검색이다.

### `POST /api/admin/members`

회원 등록(Register). Request:

```json
{
  "email": "new@example.com",
  "displayName": "New Member",
  "temporaryPassword": "Temporary123!",
  "role": "MEMBER"
}
```

- email format과 unique 검증
- displayName 필수, 최대 120자
- password 최소 10자, 영문·숫자·특수문자 포함
- BCrypt 저장
- 생성 status ACTIVE
- duplicate email은 409
- 응답에 password/hash 없음

### `GET /api/admin/members/{userId}`

단일 member 상세. 없거나 삭제된 회원은 404.

### `PATCH /api/admin/members/{userId}`

Request: displayName, role, status.

보호 규칙:

- 마지막 ACTIVE SOCIETY_ADMIN을 강등하거나 suspend/deactivate할 수 없음
- 자기 자신을 비활성화해 관리자 접근이 끊기는 경우도 위 규칙으로 방지
- 잘못된 role/status는 400
- 변경은 transaction 처리
- 삭제된 회원은 404

### `DELETE /api/admin/members/{userId}`

Soft delete. `deleted_at`을 설정한다. 응답 `{ "status": "ok" }`.

보호 규칙:

- 자기 자신 삭제 불가 403
- 마지막 ACTIVE SOCIETY_ADMIN 삭제 불가 403
- 이미 삭제됐거나 없으면 404

로그인과 `GET /api/auth/me`는 삭제된 계정을 거부한다. 코드는 `401 account_deleted` 또는 기존 inactive 처리와 구분 가능한 메시지로 한다.

## Frontend

### `/admin/members`

- Admin guard
- 제목, 설명, `Register member`
- 이름/email 검색
- status filter
- desktop table, mobile stacked cards
- columns: member, email, role, status, created, action
- loading/error/empty
- pagination
- 각 행 `Manage`

### `/admin/members/new`

- displayName, email, temporaryPassword, confirmPassword, role
- password 규칙 안내
- 일치 여부 client 검증
- submit 중 비활성화
- 성공 후 상세로 이동하며 생성 성공 banner

### `/admin/members/[userId]`

- email read-only
- displayName, role, status 수정
- 마지막 관리자 보호 오류 표시
- 저장 성공 feedback
- `Delete member`와 확인 대화상자. 성공 후 회원 목록으로 이동
- 자기 자신 또는 마지막 관리자 삭제 오류 표시
- cancel/back

Header의 Admin 메뉴는 `/admin/members`로 이동하며, 하위 admin navigation에 Members, New journal을 제공한다.

## 완료 조건

- placeholder 문구 없이 회원 목록·등록·수정·삭제 화면이 완성된다.
- frontend guard뿐 아니라 backend authorization을 강제한다.
- 비밀번호를 log, URL, 응답, React state debug output에 남기지 않는다.

