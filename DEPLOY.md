# 배포 가이드 (간단 요약)

정적 사이트(프론트)와 API(Node + MariaDB)는 **역할이 다릅니다**.

| 무엇 | GitHub Pages | Render / Railway / Cloud Run |
|------|----------------|------------------------------|
| Vue `dist` | ✅ 무료로 적합 | 가능하나 Pages가 더 단순 |
| Node API + DB | ❌ 불가 | ✅ 여기에 올리기 |

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
4. **New → PostgreSQL** 이 아니라 **MySQL** 이 있으면 그걸 쓰고, 없으면 **Docker로 MariaDB** 를 다른 서비스에 두거나, Render의 **Private Service** 대신 외부 DB(Aiven 무료체험 등)를 연결합니다.  
   **가장 단순한 데모**는 같은 Render 계정에서 **MySQL 인스턴스**를 만들고 `DB_HOST` 등을 Render가 주는 값으로 채웁니다 (`mysql2`는 MySQL/MariaDB 프로토콜 호환).
5. Environment 에 `server/.env.example` 항목을 채웁니다.  
   `HOST=0.0.0.0`, `PORT` 는 Render가 주는 `PORT`에 맞추세요 (보통 `10000` 대역 — Render가 자동 주입하는 `PORT` 사용 권장).

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

- DB는 **Cloud SQL for MySQL** 을 만들고 연결하거나, 테스트용으로 위와 같이 외부 호스트 가능한 MariaDB에 두면 됩니다.
- Cloud Run 서비스 URL을 복사해 GitHub Secret `VITE_API_BASE` 에 넣습니다.

---

## 4) 로컬에서 “서버만” Docker 이미지로 확인

```bash
docker build -t portfolio-api -f server/Dockerfile server
docker run --rm -p 3000:3000 -e DB_HOST=host.docker.internal -e DB_USER=... -e DB_PASSWORD=... -e DB_NAME=portfolio portfolio-api
```

(`host.docker.internal` 은 Docker Desktop에서 호스트의 MariaDB로 붙을 때 예시입니다.)

---

## 5) MariaDB를 클라우드에서 가장 단순히

- 이미 있는 **`docker-compose.yml`** 로 VPS(Oracle Cloud 무료 VM, Lightsail 등)에서 `docker compose up -d` 만 해도 됩니다.
- 또는 managed **PlanetScale / Aiven / Railway MySQL** 등에서 호스트·유저·비번만 API 환경 변수에 넣으면 됩니다.

---

요약: **GitHub Pages = 프론트**, **Render·Cloud Run·VPS = API+DB** 조합이 가장 이해하기 쉽습니다.
