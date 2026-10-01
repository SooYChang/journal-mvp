# STEP 01 — 프로젝트 기반, DB, API 공통 계층

## 목표

빈 디렉터리에 다음 구조를 만든다.

```text
frontend/
  app/
  components/
  lib/api/
  public/site/cover.json
  .env.local
  .env.local.example
  package.json
backend/
  src/main/java/com/institutionweb/mvp/
  src/main/resources/db/migration/
  data/uploads/.gitkeep
  data/uploads/covers/.gitkeep
  data/uploads/pdfs/.gitkeep
  build.gradle
  settings.gradle
README.md
.gitignore
```

## Frontend 기반

`package.json` scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

환경 파일 두 개에 다음 값을 넣는다. 실제 `.env.local`도 생성하되 `.gitignore`에 포함한다.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_CSRF_COOKIE_NAME=XSRF-TOKEN
```

`lib/api/client.ts` 구현 규칙:

- base URL이 없으면 명확한 configuration error를 throw한다.
- 모든 요청에 `Accept: application/json`, `credentials: 'include'`를 적용한다.
- GET/HEAD/OPTIONS 외에는 `XSRF-TOKEN` cookie 값을 읽어 `X-XSRF-TOKEN` header로 전송한다.
- non-2xx 응답의 `{ status, error, message, timestamp }`를 파싱해 `ApiError(status, code, message)`를 throw한다.
- JSON이 아닌 PDF·이미지 응답을 처리할 별도 URL helper를 제공한다.
- React component에서 직접 `fetch`하지 않고 `lib/api/*`만 사용한다.

`frontend/public/site/cover.json`을 생성한다. 이 파일은 site cover copy이며 저널 커버 이미지가 아니다.

```json
{
  "title": "Journal of Applied Systems",
  "subtitle": "Peer-reviewed research for society members."
}
```

Root layout은 `AuthProvider`, 공통 Header, Footer를 포함할 준비를 한다. global CSS/Tailwind theme에 STEP 00의 색상·타이포그래피·레이아웃 token을 정의한다.

## Backend 기반

application 설정:

```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:h2:file:./data/journal-mvp;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE
    username: sa
    password:
  flyway:
    enabled: true
  servlet:
    multipart:
      max-file-size: 25MB
      max-request-size: 27MB
app:
  upload-dir: ./data/uploads
  s3:
    bucket: ${APP_S3_BUCKET:}
    region: ${APP_S3_REGION:}
    access-key-id: ${APP_S3_ACCESS_KEY_ID:}
    secret-access-key: ${APP_S3_SECRET_ACCESS_KEY:}
  cors:
    allowed-origins: http://localhost:3000,http://127.0.0.1:3000
```

로컬 실행용 `application.yml`과 example env에는 S3 값을 비워 둔다. 네 값이 모두 비어 있지 않을 때만 S3를 사용한다. 하나라도 비어 있으면 로컬 `upload-dir`을 사용하고 부팅을 실패시키지 않는다.

`.gitignore`에는 다음을 포함한다.

```text
frontend/node_modules/
frontend/.next/
frontend/.env.local
backend/.gradle/
backend/build/
backend/data/*.mv.db
backend/data/*.trace.db
backend/data/uploads/*
!backend/data/uploads/.gitkeep
!backend/data/uploads/covers/.gitkeep
!backend/data/uploads/pdfs/.gitkeep
```

## 공통 오류 계약

모든 API 오류는 다음 형식이다.

```json
{
  "status": 400,
  "error": "validation_error",
  "message": "Journal name is required.",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

- validation 400
- authentication 401
- authorization 403
- not found 404
- duplicate/conflict 409
- storage/server 500

`@RestControllerAdvice`로 JSON 오류를 통일한다. stack trace, 절대 경로, SQL을 응답에 노출하지 않는다.

## Flyway 기본 스키마

다음 테이블을 V1 migration으로 만든다. FK와 index를 정의한다.

- `users`: id, email unique, display_name, password_hash, role, status, created_at, updated_at, deleted_at nullable
- `journals`: id(slug), name, discipline, description, issn_online, publisher, founded_year, frequency, aims_and_scope, editor_in_chief, cover_storage_key nullable, cover_content_type nullable, created_at, deleted_at nullable
- `journal_issues`: id, journal_id FK, volume, issue, published_at, description, unique(journal_id, volume, issue)
- `journal_articles`: id, issue_id FK, title, authors_json, abstract_text, keywords_json, pages, page_start nullable, doi unique nullable, article_type, published_at, citations, open_access, pdf_storage_key nullable, pdf_original_filename nullable, pdf_content_type nullable, pdf_size_bytes nullable, uploaded_at nullable, created_at, deleted_at nullable
- `article_annotations`: id, article_id FK, author_user_id FK, page_number, selected_text, position_data, body, status, created_at, updated_at
- `article_annotation_replies`: id, annotation_id FK, author_user_id FK, body, created_at

H2 JSON 타입에 종속되지 않도록 JSON 값은 CLOB/TEXT로 저장하고 Jackson으로 직렬화한다.

## 시드 데이터

BCrypt hash로 다음 로컬 계정을 만든다.

- `admin@example.com` / `Admin1234!` / `SOCIETY_ADMIN` / `ACTIVE`
- `member@example.com` / `Member1234!` / `MEMBER` / `ACTIVE`

저널 2개, 저널당 권호 1개 이상, 권호당 논문 메타데이터 3개 이상을 생성한다. 시드 저널의 `cover_storage_key`는 null이어도 된다. 시드 논문은 title, authors, abstract, keywords, pages, page_start, DOI, article type, published date, citations를 모두 갖는다. `pages`가 `"1-18"`이면 `page_start`는 `1`이다. PDF 파일은 시드하지 않아도 된다. 시드 행의 `deleted_at`은 null이다.

## 완료 조건

- Frontend/Backend 기본 프로젝트와 환경 파일이 존재한다.
- H2 file DB와 Flyway schema/seed가 구성된다.
- 공통 API client와 오류 계약이 준비된다.
- 외부 프로젝트 파일을 참조하지 않는다.

