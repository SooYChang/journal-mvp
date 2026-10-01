# STEP 05 — PDF reader와 주석

## 목표

로그인 회원이 브라우저에서 전체 PDF를 읽고 텍스트를 선택해 위치 기반 주석을 남기며 답글을 작성하게 한다.

## Frontend PDF.js 구현 규칙

`pdfjs-dist`를 사용한다.

- PDF worker를 Next.js에서 제공 가능한 local worker URL로 설정한다. 외부 CDN에 의존하지 않는다.
- backend PDF endpoint를 `withCredentials: true`로 읽는다. 이 URL은 `GET /api/journals/{journalId}/articles/{articleId}/pdf`다. presigned S3 URL이나 버킷 공개 URL로 바꾸지 않는다.
- 모든 페이지를 순서대로 canvas에 렌더링한다.
- 각 페이지 위에 PDF.js `TextLayer` class로 text layer를 렌더링한다.
- deprecated `renderTextLayer`를 사용하지 않는다.
- React 소유 DOM과 PDF.js 소유 DOM을 분리한다.
  - React: toolbar, loading, error, annotation sidebar
  - PDF.js: 전용 `pagesContainer` 내부의 canvas/text layer
- rerender 시 `pagesContainer.replaceChildren()`를 사용한다.
- `innerHTML`로 PDF 페이지를 생성하지 않는다.
- unmount/zoom 변경 시 loading task, render task, event listener를 정리한다.

Reader toolbar:

- article detail로 돌아가기
- 문서 title
- zoom out / percentage / zoom in
- 최소 80%, 최대 160%, 20% 간격
- 페이지 수와 loading 상태
- 선택 텍스트가 있을 때 `Add annotation`

오류 상태:

- 비로그인 → 로그인 안내와 returnTo
- PDF 없음 → article detail로 돌아가기
- 401/403 → 권한 안내
- network/render error → 재시도

## 위치 데이터

텍스트 selection의 `Range.getClientRects()`를 사용한다. 각 rect를 해당 PDF page element 기준 상대 좌표로 변환한다.

```json
{
  "version": 1,
  "pages": [
    {
      "pageNumber": 1,
      "rects": [
        { "left": 0.12, "top": 0.33, "width": 0.25, "height": 0.02 }
      ]
    }
  ]
}
```

- left/top/width/height는 0~1 사이 값
- 소수점 6자리 이하
- zoom과 관계없이 동일 위치를 표현
- backend는 JSON version, page number, rect numeric range, 배열 크기를 검증
- 저장된 주석 선택 시 viewer에 highlight overlay를 그려 해당 페이지로 scroll

## Annotation API

모두 로그인 필요다.

### `GET /api/journals/{journalId}/articles/{articleId}/annotations`

Response `Annotation[]`:

```json
{
  "id": 1,
  "articleId": 100,
  "author": { "id": 2, "displayName": "Local Member" },
  "pageNumber": 1,
  "selectedText": "selected PDF text",
  "positionData": "{...}",
  "body": "My note",
  "status": "OPEN",
  "createdAt": "...",
  "updatedAt": "...",
  "canEdit": true,
  "canResolve": false,
  "replies": []
}
```

Backend가 현재 사용자 기준 `canEdit`, `canResolve`를 계산한다.

### `POST .../annotations`

Request: `pageNumber`, `selectedText`, `positionData`, `body`. 빈 텍스트 금지. selectedText 최대 2000자, body 최대 5000자.

### `PATCH .../annotations/{annotationId}`

- 작성자는 body 수정 가능
- 관리자만 status를 `OPEN` 또는 `RESOLVED`로 변경 가능
- 다른 사용자는 403

### `DELETE .../annotations/{annotationId}`

- 작성자 또는 관리자
- reply도 transaction으로 삭제
- `{ "status": "ok" }`

### `POST .../annotations/{annotationId}/replies`

Request `{ "body": "..." }`, 최대 3000자. 모든 로그인 회원 가능.

각 annotationId가 요청 articleId와 journalId에 실제 속하는지 모든 mutation에서 검증한다.

## Annotation sidebar UX

- OPEN/RESOLVED filter
- 작성자, 페이지, 선택 문장, 본문, 시간
- 클릭 시 해당 highlight와 페이지로 이동
- reply 목록과 inline reply composer
- 본인에게 edit/delete
- 관리자에게 resolve/reopen/delete
- optimistic delete를 사용하더라도 실패 시 복구
- annotation 생성 성공 후 selection state 정리와 목록 refresh
- 빈 상태와 API error 표시

## 완료 조건

- PDF의 모든 페이지와 selectable TextLayer가 표시된다.
- 선택 영역이 상대 좌표로 저장·복원된다.
- 작성자 소유권과 관리자 권한이 backend에서 강제된다.
- 주석과 답글의 loading/error/empty 상태가 완성된다.

