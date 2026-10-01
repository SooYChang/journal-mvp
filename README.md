# Journal MVP

Local academic journal service: browse journals and articles, read PDFs, annotate passages, and administer members. This is a development MVP. It does not include peer review, submissions, payments, email invites, or production deployment.

## 1. Prerequisites

- Node.js 20+ and npm
- Java 17 or 21
- Two terminal windows

You do not need PostgreSQL, Docker, AWS, R2, or an email service. Optional AWS S3 is used only when all four `APP_S3_*` values are set.

## 2. Backend

In a terminal:

```bash
cd backend
./gradlew bootRun
```

On Windows Command Prompt use `gradlew.bat bootRun`.

The API listens on `http://localhost:8080`. Data is stored in the H2 file database `backend/data/journal-mvp*.db`. Uploaded covers and PDFs go to `backend/data/uploads/` unless S3 is configured.

## 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` must contain:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_CSRF_COOKIE_NAME=XSRF-TOKEN
```

The app listens on `http://localhost:3000`.

## 4. URLs

```text
Home: http://localhost:3000
Login: http://localhost:3000/login
Journals: http://localhost:3000/journals
Repository: http://localhost:3000/repository
Backend health: http://localhost:8080/api/health
Admin members: http://localhost:3000/admin/members
Create journal: http://localhost:3000/admin/journals/new
```

Dynamic URLs after seed data exists:

```text
Browse articles: http://localhost:3000/journals/applied-systems/articles
Article detail: http://localhost:3000/journals/applied-systems/articles/1
PDF reader: http://localhost:3000/journals/applied-systems/articles/1/read
Upload article: http://localhost:3000/admin/journals/applied-systems/articles/new
```

## 5. Demo accounts (local development only)

- Admin: `admin@example.com` / `Admin1234!`
- Member: `member@example.com` / `Member1234!`

Do not use these passwords outside this machine.

## 6. What to check in the browser

1. Home shows `cover.json` title/subtitle and up to three journal cards (placeholder if there is no cover image). Open Journals.
2. Repository search, filters, sort, and pagination.
3. Journal introduction, Browse articles, issue contents in page order, article detail.
4. Admin login.
5. Create a journal with a required cover image, or create an issue on a seed journal.
6. Upload article metadata and a PDF (no S3 required).
7. Open the PDF reader from that article.
8. Select text, add an annotation, reply, edit, and delete.
9. Log in as the member account and confirm author-only edit/delete.
10. Admin members: register, edit role/status, delete. Deleted members must leave the list and must not log in.
11. Delete a journal or article and confirm it disappears from public lists.
12. Edit `frontend/public/site/cover.json` title/subtitle, refresh the home page. Next.js rebuild is not required.
13. Restart the backend and confirm members, journals, PDFs, and annotations remain.

## 7. Stop the servers

Press `Ctrl+C` in each terminal.

## 8. Reset local data (manual)

Do not run this unless you intend to wipe development data.

1. Stop the backend.
2. Delete `backend/data/journal-mvp.mv.db` and `backend/data/journal-mvp.trace.db` if present.
3. Optionally delete files under `backend/data/uploads/covers` and `backend/data/uploads/pdfs`, keeping the `.gitkeep` files.
4. Start the backend again. Seed journals and demo users are recreated.

## 9. Site cover copy

Edit only `title` and `subtitle` in `frontend/public/site/cover.json`. Keep valid JSON quotes and commas. Refresh the browser. This file is not a journal cover image. Commit it if you want the change in a deployed copy.

## 10. Optional S3

If `APP_S3_BUCKET`, `APP_S3_REGION`, `APP_S3_ACCESS_KEY_ID`, and `APP_S3_SECRET_ACCESS_KEY` are all set, covers and PDFs are stored in that bucket. If any value is missing, files stay in `backend/data/uploads`. The browser never calls S3 directly.

## 11. Common problems

- Port 3000 or 8080 already in use: stop the previous Next.js or Spring Boot process, then start again.
- Java version: install Java 17+ and ensure `java -version` works.
- `npm install` fails: check Node 20+ and network access.
- 401 on PDF or annotations: log in first.
- 403 on admin pages: use the admin demo account.
- PDF missing: upload a PDF from the admin article form. Seed articles have metadata only.

## Gradle wrapper

This project includes Gradle Wrapper 9.4.0 so the backend can start on JDK 17 through JDK 26. The application still compiles to Java 17 bytecode (Spring Boot 3.4.5). On Windows use `gradlew.bat bootRun`.
