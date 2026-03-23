# 배포 가이드 (간단 요약)

정적 사이트(프론트)와 API(Node + DB)는 **역할이 다릅니다**. DB는 **Supabase(Postgres)** 를 쓰면 서버에서 설치할 필요가 없습니다.

| 무엇 | GitHub Pages | Render / Railway / Cloud Run |
|------|----------------|------------------------------|
| Vue `dist` | ✅ 무료로 적합 | 가능하나 Pages가 더 단순 |
| Node API + DB | ❌ 불가 | ✅ API만 여기에, DB는 Supabase |

---

## Supabase 연동 (비전공자용 순서)

1. **Supabase**에서 프로젝트를 만듭니다.
2. 왼쪽 **Project Settings**(톱니바퀴) → **Database** 로 갑니다.
3. **Connection string** / **URI** 에서 `postgresql://postgres:[YOUR-PASSWORD]@db....` 형태를 복사합니다.
4. `[YOUR-PASSWORD]` 를 **실제 DB 비밀번호**로 바꿉니다. (프로젝트 만들 때 정한 비밀번호; 잊었으면 Database 메뉴에서 재설정)
5. PC에서 `server` 폴더에 **`.env`** 파일을 만들고 한 줄 넣습니다:  
   `DATABASE_URL=postgresql://postgres:비밀번호@db.xxx.supabase.co:5432/postgres`  
   이 파일은 **Git에 올리지 마세요** (이미 `.gitignore`에 `.env`가 있으면 안 올라갑니다).
6. (선택) Supabase **SQL Editor**에서 `server/sql/schema.postgres.sql` 내용을 붙여 실행해 테이블을 미리 만들 수 있습니다. **안 해도 됩니다** — API 서버를 처음 띄울 때 자동으로 같은 테이블을 만들도록 되어 있습니다.
7. 터미널에서:
   - `cd server` → `npm install` → `npm run dev`  
   - 프로젝트 루트에서 `npm run dev` (프론트) — Vite가 `/api`를 API로 넘깁니다.
8. 배포할 때는 **Render** 등에 API를 올리고, 그 서비스의 Environment에 **`DATABASE_URL`** 을 Supabase에서 복사한 값으로 넣습니다. 프론트 빌드에는 **`VITE_API_BASE`** 에 배포된 API 주소를 넣습니다.

**비공개 GitHub 저장소**는 무료로 **GitHub Pages**가 막힐 수 있습니다. 그때는 저장소를 **공개**로 바꾸거나, `dist` 폴더를 **Netlify / Cloudflare Pages** 에 올리는 방법을 쓰면 됩니다.

---

## 1) 프론트만 가장 쉽게: GitHub Pages

1. 이 저장소를 GitHub에 푸시합니다.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions** 로 둡니다.
3. `main`(또는 `master`)에 푸시하면 `.github/workflows/deploy-github-pages.yml` 이 `dist`를 배포합니다.
4. 주소 형태: `https://<사용자>.github.io/portfolio-site/`  
   (`vite.config.ts`의 `base: '/portfolio-site/'` 는 **저장소 이름**과 맞춰야 합니다. 이름이 다르면 `base`와 워크플로만 그에 맞게 수정하세요.)

### API까지 쓰려면 (게시판·소비 도시 DB)

1. 아래 2번처럼 API를 먼저 배포해 **공개 URL**을 만듭니다 (예: `https://portfolio-api-xxxx.onrender.com`).
2. GitHub 저장소 **Settings → Secrets and variables → Actions** 에 `VITE_API_BASE` 를 추가하고 값을 그 URL로 넣습니다 (끝에 `/` 없이).
3. 다시 워크플로를 돌리면 빌드된 프론트가 해당 API로 요청합니다.
4. API 쪽 **CORS**: Render/Railway 환경 변수 `CORS_ORIGIN` 에  
   `https://<사용자>.github.io` 를 넣거나 `*` 로 테스트할 수 있습니다.

---

## 2) API + DB: Render.com (가입 후 클릭 위주)

1. [render.com](https://render.com) 에 가입 → **New → Web Service** → GitHub 연결.
2. **Root Directory** 를 `server` 로 지정 (또는 Docker 사용 시 아래 참고).
3. **Build Command**: `npm ci && npm run build`  
   **Start Command**: `node dist/index.js`
4. Environment 에 **`DATABASE_URL`** (Supabase Postgres URI) 과 `CORS_ORIGIN` 등을 넣습니다.  
   `HOST=0.0.0.0`, `PORT` 는 Render가 주는 `PORT`에 맞추세요.

**Docker로 API만 올리기 (Render)**  

- **New Web Service → Docker**  
- **Dockerfile Path**: `server/Dockerfile`  
- **Docker Context**: 저장소 루트에서 빌드 시 Render 설정에 **Root Directory** 를 비우고, Dockerfile 경로만 `server/Dockerfile` 로 지정하는 방식이 서비스마다 다르니, Render UI에서 “Docker” 선택 후 레포 루트 기준으로 `server/Dockerfile` 을 지목하면 됩니다.

---

## 3) API: Google Cloud Run (GCP)

로컬에 [gcloud CLI](https://cloud.google.com/sdk) 설치 후:

```bash
cd server
gcloud run deploy portfolio-api --source . --region asia-northeast3 --allow-unauthenticated
```

- DB는 **Supabase** 또는 **Cloud SQL for PostgreSQL** 등에 두고 `DATABASE_URL` 로 연결하면 됩니다.
- Cloud Run 서비스 URL을 복사해 GitHub Secret `VITE_API_BASE` 에 넣습니다.

---

## 4) 로컬에서 “서버만” Docker 이미지로 확인

```bash
docker build -t portfolio-api -f server/Dockerfile server
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://..." portfolio-api
```

---

## 5) 로컬 DB만 쓰고 싶을 때 (선택)

- 루트의 **`docker-compose.yml`** 은 로컬 **MariaDB** 예시입니다. 현재 API는 **Postgres** 이므로, 로컬에서 Postgres를 쓰거나 Supabase만 쓰는 편이 맞습니다.

---

요약: **GitHub Pages = 프론트**, **Supabase = DB**, **Render·Cloud Run = API** 조합이 단순합니다.
