# STEP 04 — ObjectStorage, 저널 커버, 논문 PDF

## 목표

SOCIETY_ADMIN이 저널 커버 이미지와 논문 PDF를 업로드하면 공통 `ObjectStorage`에 저장되고, H2 file DB 메타데이터와 함께 유지된다. AWS S3가 연결되어 있으면 S3를 쓰고, 아니면 로컬 디스크에 저장한다. 프론트는 저장 백엔드를 모른다.

## 공통 ObjectStorage

커버와 PDF는 같은 인터페이스와 같은 env 규칙을 사용한다. 버킷을 둘로 쪼개지 않는다. prefix만 다르게 한다.

- 커버 키: `covers/{journalId}/{uuid}.{ext}`
- PDF 키: `pdfs/{articleId}/{uuid}.pdf`

S3 사용 조건: `APP_S3_BUCKET`, `APP_S3_REGION`, `APP_S3_ACCESS_KEY_ID`, `APP_S3_SECRET_ACCESS_KEY`가 모두 비어 있지 않다. 하나라도 비어 있으면 로컬이다. 빈 버킷만 있고 키가 없으면 로컬이다. 부팅을 실패시키지 않는다.

로컬 기본 경로: `APP_UPLOAD_DIR`(기본 `backend/data/uploads`). 시작 시 `covers/`와 `pdfs/`를 생성한다. 로컬 put은 upload root 밖으로 나가지 못하게 resolve 검증한다.

인터페이스: put, get(stream), delete. Cover 서비스와 PDF 서비스는 이 인터페이스만 호출한다. AWS SDK는 의존성에 넣어도 되지만 로컬 모드에서 S3 클라이언트를 필수로 초기화하지 않는다.

금지:

- API JSON·로그에 버킷, 로컬 절대 경로, storage key 노출
- 프론트 `public/`에 저널 커버·PDF를 두는 방식
- 카드/`pdf.js`가 S3 URL 또는 presign을 직접 쓰는 방식
- S3가 없다고 저널 생성·PDF 업로드를 막는 방식
- S3를 MVP 필수 의존성으로 만드는 방식
- 로컬에 쌓인 파일을 S3 연결 후 일괄 이관하는 migration job

원본 파일명을 저장 키로 쓰지 않는다.

## 저널 커버 저장

STEP 03의 `POST /api/admin/journals`가 ObjectStorage put을 호출한다.

커버 파일 검증:

- 필수
- 최대 5MB
- MIME `image/jpeg`, `image/png`, `image/webp`
- magic byte 확인
- 원본 파일명은 `Path.getFileName()`과 길이 제한으로 정리

`GET /api/journals/{journalId}/cover`는 공개 스트림이다. 전체를 byte[]로 올리지 않는다. 없으면 404.

## 논문 PDF 업로드 API

### `POST /api/admin/journals/{journalId}/articles`

`multipart/form-data`:

- `issueId`: 해당 저널의 권호 ID
- `title`: required
- `authors`: JSON array string 또는 반복 field. Backend에서 최종 string array로 변환
- `abstractText`: required
- `keywords`: JSON array string 또는 comma-separated input
- `pages`
- `doi`
- `articleType`: required
- `publishedAt`: ISO date required
- `citations`: 기본 0
- `openAccess`: 기본 true
- `pdf`: required

`pages`를 저장할 때 `page_start`를 계산한다. 선행 정수 추출: `"1-18"` → `1`, `"12"` → `12`, 비어 있으면 `NULL`. PDF 페이지 수를 파싱하지 않는다.

PDF 파일 검증:

- 필수 파일
- 최대 25MB
- MIME `application/pdf`
- 첫 5 byte가 `%PDF-`
- 원본 파일명은 `Path.getFileName()`과 길이 제한으로 정리

처리 순서:

1. 관리자 권한 확인
2. journal과 issue 관계 확인. 삭제된 저널이면 404
3. metadata와 PDF 검증
4. ObjectStorage에 put (로컬이면 temp 후 최종 키, S3면 동일 키로 put)
5. DB row 생성 (`pdf_storage_key`는 ObjectStorage 키)
6. 성공 응답

실패 시 DB row와 임시 객체(로컬 temp 또는 미완성 S3 put)를 정리한다. DOI 중복은 409다.

Response는 `JournalArticleDetail`이며 `hasPdf=true`, `pdfOriginalFilename`, `pdfSizeBytes`, `uploadedAt`을 포함할 수 있다. storage key는 포함하지 않는다.

## PDF content API

### `GET /api/journals/{journalId}/articles/{articleId}/pdf`

- 로그인 MEMBER 또는 SOCIETY_ADMIN만 접근
- journal과 article 관계 확인. 삭제된 저널/논문은 404
- 파일이 없으면 `404 pdf_not_found`
- ObjectStorage get 스트림. S3면 `GetObject` 스트림, 로컬이면 파일 스트림. 전체를 byte[]로 올리지 않음
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename*=UTF-8''<encoded-name>`
- 정확한 `Content-Length`
- `Cache-Control: private, no-store`
- range request는 선택 사항이며 MVP 완료를 막지 않는다.

## Frontend 업로드 화면

`/admin/journals/[journalId]/articles/new`:

- Admin guard
- 현재 저널명 표시
- issue select. issue가 없으면 `Create issue first` 안내와 링크
- title, 동적 author 입력 또는 delimiter 안내
- abstract textarea
- keyword 입력
- pages, DOI, article type, published date
- PDF file input (`accept="application/pdf"`)
- 선택 파일명과 크기 표시
- client에서도 25MB와 PDF type 선검증
- 제출 중 중복 submit 방지와 progress-like 상태
- multipart 요청에서 `Content-Type`을 직접 지정하지 않고 browser boundary를 사용
- 성공 후 article detail로 이동
- backend validation/storage 오류를 그대로 이해 가능한 문장으로 표시

저널 생성 화면의 커버 input은 STEP 03 계약을 따른다. 이 STEP에서 ObjectStorage put이 실제로 동작해야 한다.

## 로컬 지속성

- H2는 in-memory가 아니라 file DB여야 한다.
- Backend 재시작 후 PDF metadata와 annotation이 유지되어야 한다.
- 로컬 모드에서는 PDF/커버 파일과 DB row가 함께 남아야 한다.
- S3 모드에서도 DB row의 storage key로 객체를 다시 읽을 수 있어야 한다.
- README에 개발 데이터를 초기화하는 방법을 별도 수동 절차로 설명하되 자동 삭제 command를 실행하지 않는다.
- Soft delete는 DB `deleted_at`만 설정한다. S3 object와 로컬 파일을 즉시 purge하지 않는다.

## 완료 조건

- S3 env가 없어도 로컬에서 저널 커버와 PDF 업로드가 가능하다.
- S3 env가 모두 있으면 같은 API가 S3 put/get을 사용한다.
- 업로드 파일 검증과 path traversal 방지가 구현된다.
- DB와 객체 저장의 실패 정리가 구현된다.
- 로그인한 회원이 사용할 PDF stream endpoint가 준비된다.
- 공개 커버 stream endpoint가 준비된다.
