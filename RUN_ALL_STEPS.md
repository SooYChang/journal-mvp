# Journal MVP — 독립형 전체 실행 프롬프트

이 폴더의 Markdown 파일만 사용해 빈 작업 디렉터리에서 학술 저널 MVP를 완성하라. 기존 프로젝트, 외부 샘플 코드, 다른 프롬프트, 디자인 문서 또는 저장소의 다른 폴더를 참고하지 않는다.

## 실행 방식

아래 STEP을 번호 순서대로 수행한다. 이전 STEP에서 만든 코드는 다음 STEP에서 이어서 수정한다. 이미 존재하는 코드를 무시하고 다시 생성하지 말고, 현재 상태를 확인한 뒤 필요한 변경만 한다.

1. `STEP_00_PRODUCT_CONTRACT.md`
2. `STEP_01_PROJECT_FOUNDATION.md`
3. `STEP_02_AUTH_AND_HOME.md`
4. `STEP_03_JOURNALS_AND_REPOSITORY.md`
5. `STEP_03A_GLOBAL_REPOSITORY.md`
6. `STEP_04_PDF_UPLOAD_AND_STORAGE.md`
7. `STEP_05_PDF_READER_AND_ANNOTATIONS.md`
8. `STEP_06_ADMIN_MEMBERS.md`
9. `STEP_07_INTEGRATION_AND_UX.md`
10. `STEP_08_LOCAL_RUN_HANDOFF.md`

## 절대 규칙

- 구현 위치는 현재 작업 디렉터리의 `frontend/`와 `backend/`다.
- Frontend는 Next.js App Router + TypeScript, Backend는 Spring Boot + Java + Gradle을 사용한다.
- Frontend `http://localhost:3000`, Backend `http://localhost:8080`으로 연결한다.
- 외부 PostgreSQL, R2, AWS, Docker, 이메일 서비스가 없어도 모든 MVP 기능을 로컬에서 사용할 수 있어야 한다. AWS S3는 옵션이다. S3 환경 변수가 없으면 저널 커버와 PDF를 로컬 디스크에 저장한다.
- DB는 H2 파일 DB를 사용한다. 서버를 재시작해도 회원·저널·논문·주석 데이터가 유지되어야 한다.
- 홈 히어로 문구(site cover copy)는 `frontend/public/site/cover.json`에서 읽는다.
- 저널 커버 이미지와 논문 PDF는 공통 `ObjectStorage`로 저장한다. S3가 연결되면 S3, 아니면 로컬 `APP_UPLOAD_DIR`이다. 브라우저는 S3를 직접 호출하지 않는다.
- 관리자는 저널·논문·회원을 soft delete할 수 있다. 공개 API는 삭제된 행을 반환하지 않는다.
- 모든 동적 데이터는 실제 backend API를 사용한다. mock, fallback fixture, 가짜 성공 응답을 만들지 않는다.
- API 필드명과 TypeScript 타입 필드명을 동일하게 유지한다.
- 비밀번호는 BCrypt로 저장하고 응답에 포함하지 않는다.
- Backend 세션 인증, CORS credentials, CSRF double-submit cookie 방식을 사용한다.
- 사용자가 요청하지 않은 심사, 투고, 결제, 이메일 초대, 학회 행사, 배포 기능은 추가하지 않는다.
- 핵심 구현을 TODO, placeholder 화면, 비활성 버튼으로 남기지 않는다.

## 검증 제한

코드 구현 후 AI는 브라우저 자동화, `curl`, API 직접 호출, Playwright/E2E, 실제 로그인, PDF 업로드, 주석 작성, DB 직접 조회를 수행하지 않는다.

다음까지만 수행한다.

1. Frontend 의존성 설치 후 `npm run dev`
2. Backend 의존성 준비 후 `./gradlew bootRun`
3. 두 서버의 시작 로그 확인
4. 사용자가 직접 확인할 localhost URL과 로컬 데모 계정 안내

컴파일 또는 서버 시작 오류는 수정하고 다시 시작한다. 서버가 시작됐다는 이유만으로 기능 검증까지 완료됐다고 주장하지 않는다.
