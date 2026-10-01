# STEP 03 — 저널, 권호, 논문 탐색

## 목표

사용자가 `저널 목록 → 저널 소개 → 논문 목록 또는 권호 → 논문 상세` 흐름으로 연구 자료를 찾게 한다. 화면 이름에 `Journal Repository`를 사용하지 않는다. `/journals/[id]/articles` 제목은 `Browse articles`로 표시한다.

## API 계약

### 저널

#### `GET /api/journals`

Query:

- `query` optional: 이름·설명 검색
- `discipline` optional
- `sort`: `newest` 또는 `name`, 기본 `name`
- `size` optional; 없으면 전체, 최대 100

공개 GET은 `journals.deleted_at IS NULL`만 반환한다.

`JournalSummary[]`:

```json
{
  "id": "applied-systems",
  "name": "Journal of Applied Systems",
  "discipline": "Computer Science",
  "description": "...",
  "issnOnline": "2765-1001",
  "publisher": "Institute Press",
  "foundedYear": 2018,
  "frequency": "Quarterly",
  "coverUrl": "/api/journals/applied-systems/cover"
}
```

`coverUrl`은 커버가 있을 때만 API 경로다. 시드 저널처럼 파일이 없으면 `null`이다. 버킷명·storage key·로컬 절대 경로는 넣지 않는다.

#### `GET /api/journals/disciplines`

DB에서 중복 제거한 discipline string 배열을 반환한다.

#### `GET /api/journals/{journalId}`

삭제된 저널은 404다. `JournalDetail`은 summary 필드와 `aimsAndScope`, `editorInChief`, `issues`를 포함한다.

#### `GET /api/journals/{journalId}/cover`

공개 이미지 스트림이다. ObjectStorage에서 커버를 읽어 응답한다. 파일이 없으면 404. 브라우저가 S3를 직접 호출하지 않는다.

#### `GET /api/journals/{journalId}/issues/{issueId}`

```json
{
  "id": 10,
  "journalId": "applied-systems",
  "volume": 7,
  "issue": 1,
  "publishedAt": "2026-03-01",
  "description": "...",
  "articles": [
    {
      "id": 100,
      "title": "...",
      "authors": ["Hana Kim", "David Chen"],
      "pages": "1-18",
      "doi": "10.1234/jas.2026.001",
      "articleType": "Research Article",
      "hasPdf": false
    }
  ]
}
```

저널에 속하지 않는 issueId는 404다. 삭제된 저널에 속한 권호도 404다. `articles`는 `deleted_at IS NULL`만 포함하고 `page_start ASC NULLS LAST`, 동률이면 `id ASC`다. 프론트는 이 순서를 유지하고 클라이언트에서 재정렬하지 않는다. PDF 페이지 수 분석이나 OCR로 정렬하지 않는다.

### 논문 탐색

#### `GET /api/journals/{journalId}/articles`

Query:

- `query`: title, abstract, author, keyword 검색
- `year`
- `volume`
- `issue`
- `articleType`
- `sort`: `relevance`, `newest`, `citations`, `title`
- `page`: 0-based
- `size`: 기본 10, 최대 50

Response:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 1
}
```

각 content는 다음 필드를 포함한다.

```json
{
  "id": 100,
  "title": "...",
  "authors": ["Hana Kim", "David Chen"],
  "abstractPreview": "최대 240자...",
  "keywords": ["resilience", "systems"],
  "pages": "1-18",
  "doi": "10.1234/jas.2026.001",
  "articleType": "Research Article",
  "publishedAt": "2026-03-01",
  "citations": 12,
  "hasPdf": true,
  "volume": 7,
  "issue": 1
}
```

#### `GET /api/journals/{journalId}/articles/filter-options`

DB 실제 값에서 `{ years, volumes, issues, articleTypes, keywords }`를 계산한다.

논문 목록·상세 쿼리는 해당 저널이 삭제되지 않았고 논문 `deleted_at IS NULL`인 행만 포함한다.

#### `GET /api/journals/{journalId}/articles/{articleId}`

summary 전체와 `abstractText`, 전체 authors/keywords, `journal` summary를 반환한다. 다른 저널 articleId, 삭제된 논문, 삭제된 저널의 논문은 404다.

## Frontend 화면

### `/journals`

- 페이지 제목과 소개
- 검색 input, discipline select
- 활성 필터 chip과 clear 기능
- 저널 카드 grid. 홈과 동일한 journal cover image 규칙: `coverUrl`이면 `object-cover` 고정 aspect, 없으면 플레이스홀더, `onerror` 시 플레이스홀더
- loading/error/empty
- 관리자에게만 `Create journal` 버튼

### `/journals/[journalId]`

- breadcrumb
- 저널명, 분야, 소개
- ISSN, publisher, founded year, frequency, editor-in-chief
- aims & scope
- `Browse articles` primary CTA
- 권호 목록. 권호 클릭 → issue view
- 관리자에게 `Add issue`, `Upload article`, `Delete journal` 버튼. Delete는 확인 대화상자 후 `DELETE /api/admin/journals/{journalId}`. 성공 시 `/journals`로 이동

### `/journals/[journalId]/articles`

원본 학술 Repository의 탐색 밀도를 갖되 현재 저널 안에서만 검색한다.

- 데스크톱: 좌측 filter sidebar, 우측 결과
- 모바일: 검색과 filter controls를 결과 위에 배치
- search debounce 200~350ms
- year, volume, issue, article type 필터
- active filter chips와 `Clear all`
- sort select
- `N results`, 현재 결과 범위
- 논문 카드/행: type, title, authors, abstract preview, volume/issue/date, DOI, citations, keywords, PDF availability
- 0-based API를 사용자에게 1-based page로 표시
- query/filter/sort 변경 시 page를 0으로 초기화
- 관리자인 경우 `Upload article PDF`

### 논문/권호 상세

- issue view는 권호 설명과 contents를 보여 주며 각 논문 상세로 연결한다. contents 순서는 API `page_start` 순이다.
- article detail은 제목, 저자, 저널/권호, 날짜, 페이지, DOI, citations, abstract, keywords를 표시한다.
- `hasPdf=true`이면 로그인 사용자에게 `Read PDF & annotations`, 비로그인에게 로그인 안내를 표시한다.
- `hasPdf=false`이면 `PDF not uploaded yet`을 표시한다.
- 관리자에게 `Delete article`. 확인 후 `DELETE /api/admin/journals/{journalId}/articles/{articleId}`. 성공 시 해당 저널 논문 목록으로 이동. 일반 회원에게는 버튼을 그리지 않는다.

## 관리자 저널·권호 생성과 삭제

### `POST /api/admin/journals`

`multipart/form-data`. 메타데이터 필드: name, optional slug, discipline, description, issnOnline, publisher, foundedYear, frequency, aimsAndScope, editorInChief. `cover` 파일은 **필수**다 (jpeg/png/webp, 최대 5MB, MIME과 magic byte 검증). 필수값 검증, slug 중복 시 안전한 suffix 또는 409 정책 중 하나를 일관되게 적용한다. 파일 put 실패 시 저널 row를 롤백한다. 저장은 STEP 04 ObjectStorage를 사용한다. S3가 없다고 생성을 막지 않는다.

`/admin/journals/new` 폼에 커버 파일 input, 미리보기, 클라이언트 크기/타입 선검증을 둔다.

### `POST /api/admin/journals/{journalId}/issues`

Request: volume, issue, publishedAt, description. 중복 volume/issue는 409다.

### `DELETE /api/admin/journals/{journalId}`

SOCIETY_ADMIN 전용. 이미 삭제됐거나 없으면 404. `journals.deleted_at`을 설정한다. 소속 권호/논문 물리 파일은 당장 지우지 않는다. 이후 공개 GET에서 저널과 소속 논문이 빠져야 한다. 응답 `{ "status": "ok" }`.

### `DELETE /api/admin/journals/{journalId}/articles/{articleId}`

SOCIETY_ADMIN 전용. 저널-논문 소속 확인. 이미 삭제됐거나 없으면 404. `journal_articles.deleted_at`만 설정한다. PDF 객체는 당장 purge하지 않는다. 응답 `{ "status": "ok" }`.

각 관리자 form route를 구현하고 성공 후 생성된 공개 상세 화면으로 이동한다.

## 완료 조건

- 모든 공개 화면이 실제 API에서 데이터를 가져온다.
- 논문 검색·필터·정렬·페이지네이션이 backend query와 연결된다.
- 권호 contents는 `page_start` 순이다.
- 관리자 저널 생성에 커버가 필수이고, 홈/`/journals` 카드가 `coverUrl` 또는 플레이스홀더를 쓴다.
- 관리자 soft delete 후 공개 목록에서 저널·논문이 사라진다.
- `Journal Repository`라는 별도 메뉴/페이지명 없이 저널과 논문 흐름이 자연스럽다.

