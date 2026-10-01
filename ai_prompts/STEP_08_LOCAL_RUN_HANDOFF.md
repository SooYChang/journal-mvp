# STEP 08 — 로컬 실행과 사용자 인계

## 중요한 제한

이 STEP은 서버를 시작 가능한 상태로 만드는 단계다. AI가 브라우저/API 기능 테스트를 대신 수행하는 단계가 아니다.

금지:

- `curl`, HTTP client, Postman
- 브라우저 자동 접속/클릭
- Playwright/E2E
- 실제 로그인
- PDF 업로드/열람
- 주석 생성
- DB console/query
- 테스트 계정을 사용한 기능 검증

허용:

- 의존성 설치
- compile 오류 수정
- 개발 서버 시작 명령
- 시작 로그 확인
- port conflict 확인과 사용자의 MVP 개발 프로세스 재기동

## 실행 준비

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
./gradlew bootRun
```

Gradle wrapper가 없는 빈 프로젝트라면 시스템 Gradle을 가정하지 말고 표준 wrapper 파일을 생성한다. 현재 실행 환경에서 wrapper 생성이 불가능하면 명확히 설명하고 사용 가능한 repository wrapper 또는 `gradle wrapper` 절차를 README에 기록한다.

## 서버 시작 로그 기준

- Frontend: Next.js가 `Local: http://localhost:3000`, `Ready` 출력
- Backend: Spring Boot가 `Tomcat started on port 8080`, `Started ...Application` 출력
- compile/start 오류가 나오면 코드·설정을 수정한 뒤 다시 시작
- 3000/8080이 다른 프로세스에 점유됐으면 정확한 PID와 command를 먼저 확인하고, 현재 MVP의 이전 개발 서버인 경우에만 종료 후 재시작

## 사용자에게 안내할 URL

```text
Home: http://localhost:3000
Login: http://localhost:3000/login
Journals: http://localhost:3000/journals
Repository: http://localhost:3000/repository
Backend health: http://localhost:8080/api/health
Admin members: http://localhost:3000/admin/members
Create journal: http://localhost:3000/admin/journals/new
```

동적 URL:

```text
Browse articles: http://localhost:3000/journals/<journal-id>/articles
Article detail: http://localhost:3000/journals/<journal-id>/articles/<article-id>
PDF reader: http://localhost:3000/journals/<journal-id>/articles/<article-id>/read
Upload article: http://localhost:3000/admin/journals/<journal-id>/articles/new
```

## 데모 계정

- Admin: `admin@example.com` / `Admin1234!`
- Member: `member@example.com` / `Member1234!`

로컬 개발 전용임을 명시한다.

## 사용자 수동 확인 순서

1. Home에서 `cover.json` 타이틀/서브타이틀과 저널 카드(이미지 또는 플레이스홀더) 확인. Journals 열기
2. Repository에서 전체 논문 검색·필터·정렬·페이지네이션 확인
3. 저널 소개, Browse articles, 권호 contents 페이지 순, 논문 상세 확인
4. Admin 로그인
5. 저널 생성 시 커버 이미지 업로드, 또는 기존 저널 권호 생성
6. 논문 메타데이터와 PDF 업로드 (S3 env 없이 로컬)
7. 업로드한 논문 상세에서 PDF reader 열기
8. 텍스트 선택 후 주석, reply, 수정/삭제 확인
9. Member 계정으로 작성자 권한 확인
10. Admin members에서 회원 등록·수정·삭제 확인. 삭제된 회원은 목록과 로그인에서 빠져야 한다
11. 저널 또는 논문 Delete 후 공개 목록에서 사라지는지 확인
12. `frontend/public/site/cover.json`을 고친 뒤 새로고침해 홈 문구가 바뀌는지 확인
13. backend 재시작 후 DB/PDF 지속성 확인

## 최종 보고 형식

- 구현한 route와 API 요약
- 로컬 storage/DB 위치와 S3가 꺼져 있을 때 커버·PDF가 로컬로 가는지
- 두 서버 시작 결과
- 접속 URL
- 데모 계정
- “서버 실행까지만 수행했으며 기능 확인은 사용자가 위 URL에서 직접 해야 한다”는 문장
- 남은 TODO가 있다면 숨기지 말고 영향과 함께 명시

모든 필수 기능이 구현되지 않았다면 완료라고 보고하지 않는다.
