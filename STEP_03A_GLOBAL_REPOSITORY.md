# STEP 03A — 전역 논문 Repository

## 목표

모든 저널과 권호에 등록된 논문을 한 화면에서 검색·필터·정렬하는 전역 `Repository` 기능을 구현한다. 저널별 `/journals/[journalId]/articles`는 특정 저널 안의 논문 탐색이고, `/repository`는 전체 저널을 대상으로 한다. 두 화면은 같은 재사용 가능한 검색 component와 API type을 공유해야 한다.

## 사용자 접근

- 비로그인 사용자도 Repository 검색과 논문 메타데이터 상세를 열람할 수 있다.
- PDF 열람과 주석은 기존 정책대로 로그인 회원만 가능하다.
- 관리자는 Repository에서 논문이 속한 저널로 이동해 PDF 업로드·관리 화면에 진입할 수 있다.

## Backend API

### `GET /api/articles`

전체 저널 논문을 대상으로 한다.

Query parameters:

- `query`: title, abstract, author, keyword, DOI 검색
- `journalId`
- `discipline`
- `year`
- `articleType`
- `openAccess`: `true` 또는 `false`
- `hasPdf`: `true` 또는 `false`
- `sort`: `relevance`, `newest`, `citations`, `title`
- `page`: 0-based, 기본 0
- `size`: 기본 10, 최대 50

Response:

```json
{
  "content": [
    {
      "id": 100,
      "journalId": "applied-systems",
      "journalName": "Journal of Applied Systems",
      "discipline": "Computer Science",
      "title": "Resilient Service Design",
      "authors": ["Hana Kim", "David Chen"],
      "abstractPreview": "최대 240자...",
      "keywords": ["resilience", "systems"],
      "volume": 7,
      "issue": 1,
      "pages": "1-18",
      "doi": "10.1234/jas.2026.001",
      "articleType": "Research Article",
      "publishedAt": "2026-03-01",
      "citations": 12,
      "openAccess": true,
      "hasPdf": true
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1,
  "totalPages": 1
}
```

검색 구현 규칙:

- `journals.deleted_at IS NULL`이고 `journal_articles.deleted_at IS NULL`인 행만 검색한다.
- query는 trim 후 case-insensitive로 검색한다.
- query가 없을 때 `relevance`는 newest와 같은 안정적인 순서를 사용한다.
- 동일 정렬값에서는 article id를 secondary sort로 사용해 페이지 결과가 흔들리지 않게 한다.
- page는 음수 금지, size는 1~50으로 제한한다.
- 각 필터는 parameter가 있을 때만 적용한다.
- count query와 content query가 동일한 filter 조건을 사용한다.

### `GET /api/articles/filter-options`

전체 DB에서 삭제되지 않은 저널·논문의 실제 값을 집계해 반환한다.

```json
{
  "journals": [
    { "id": "applied-systems", "name": "Journal of Applied Systems" }
  ],
  "disciplines": ["Computer Science"],
  "years": [2026],
  "articleTypes": ["Research Article", "Review Article"],
  "keywords": ["resilience", "systems"]
}
```

고정 mock 배열을 사용하지 않는다. journal name과 discipline은 정렬하고, year는 내림차순으로 반환한다.

### `GET /api/articles/{articleId}`

전역 논문 상세 endpoint다. 기존 저널 scoped 상세와 동일한 `JournalArticleDetail` type을 반환한다. response에 `journalId`가 있으므로 frontend는 canonical route `/journals/{journalId}/articles/{articleId}`로 이동하거나 해당 route를 직접 렌더링할 수 있다.

없는 article, 삭제된 논문, 삭제된 저널에 속한 논문은 404다.

## Frontend `/repository`

Header에 `Repository` 메뉴를 Home과 Journals 사이에 추가한다. 현재 route에서는 active state를 표시한다.

### 레이아웃

데스크톱:

- 좌측 280~320px filter sidebar
- 우측 검색 결과
- 전체 너비 최대 1320px

모바일:

- 제목과 검색창
- `Filters` 버튼 또는 접을 수 있는 filter panel
- 결과 목록
- filter 적용 후 panel을 닫아도 active chip을 유지

### 필수 UI

- 제목 `Browse Repository`
- 설명 `Search articles across all journals.`
- 검색 input과 search icon
- Journal, discipline, year, article type, open access, PDF availability 필터
- active filter chip 개별 제거
- `Clear all`
- sort select
- 전체 결과 수와 현재 표시 범위
- loading skeleton 또는 loading row
- API error + retry
- 검색 결과 없음 + filter 초기화 action
- pagination previous/next와 page 표시

### 논문 결과 카드/행

각 결과에는 다음을 표시한다.

- article type
- title
- authors
- journal name — 클릭 시 저널 소개
- volume, issue, published date, pages
- abstract preview
- DOI
- citations
- keyword chips
- open access badge
- PDF available/unavailable 상태
- `View article` → `/journals/{journalId}/articles/{articleId}`

관리자에게는 각 결과에 별도 destructive action을 넣지 않는다. 논문 상세 또는 저널 관리 화면에서 관리하게 한다.

## 재사용 구조

다음을 공통 component/type으로 분리한다.

- `ArticleSearchResults`
- `ArticleResultCard`
- `ArticleFilters`
- `ActiveFilterChips`
- `Pagination`
- `ArticleSummary`, `ArticlePage`, `ArticleFilterOptions`

전역 Repository는 `scope=global`, 저널별 논문 목록은 `scope=journal` 또는 `journalId` prop으로 같은 핵심 component를 사용한다. URL과 지원 filter가 다르더라도 결과 카드, loading/error/empty, pagination 동작을 중복 구현하지 않는다.

## URL 상태

검색과 filter 상태를 가능하면 query string과 동기화한다.

예:

```text
/repository?query=systems&journalId=applied-systems&year=2026&sort=newest&page=1
```

- 새로고침과 링크 공유 시 상태가 유지되어야 한다.
- 사용자 표시 page는 1-based, API 요청은 0-based로 변환한다.
- 잘못된 query 값은 안전한 기본값으로 정규화한다.

## 홈 연결

메인 홈의 primary CTA를 `Browse Repository`로 설정할 수 있다. 별도로 `Browse journals` CTA도 제공한다. 최근 논문 3개 섹션을 추가하는 경우 반드시 `GET /api/articles?sort=newest&size=3` 실제 응답을 사용한다.

## 완료 조건

- `/repository`에서 모든 저널 논문을 실제 API로 탐색할 수 있다.
- 검색·필터·정렬·페이지네이션과 URL 상태가 연결된다.
- 결과에서 저널 소개와 논문 상세로 이동할 수 있다.
- 저널별 논문 목록과 전역 Repository가 공통 component/type을 재사용한다.
- mock fallback이나 외부 search service가 없다.

