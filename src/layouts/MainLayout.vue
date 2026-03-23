<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { SITE } from '../config/site'
import './MainLayout.css'
</script>

<template>
  <div class="shell">
    <aside class="side-nav" aria-label="주요 메뉴">
      <nav class="side-nav__inner">
        <RouterLink to="/" class="nav-link" active-class="nav-link--active" end>
          Home
        </RouterLink>
        <RouterLink to="/about" class="nav-link" active-class="nav-link--active">
          About
        </RouterLink>
        <RouterLink to="/project" class="nav-link" active-class="nav-link--active">
          Project
        </RouterLink>
        <RouterLink to="/board" class="nav-link" active-class="nav-link--active">
          Board
        </RouterLink>
      </nav>
      <a
        class="side-nav__github"
        :href="SITE.githubUrl"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub 프로필"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.9c.58.1.79-.25.79-.55 0-.27-.01-1.16-.01-2.1-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.2-3.08-.12-.3-.52-1.52.11-3.18 0 0 .97-.31 3.18 1.2a11 11 0 0 1 5.8 0c2.2-1.51 3.17-1.2 3.17-1.2.64 1.66.24 2.88.12 3.18.75.8 1.2 1.82 1.2 3.08 0 4.42-2.69 5.38-5.25 5.66.42.36.8 1.08.8 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
          />
        </svg>
      </a>
    </aside>

    <div class="main-column">
      <main class="page-main">
        <RouterView />
      </main>
      <footer class="site-footer">
        <p>Copyright © {{ SITE.copyrightYear }}</p>
      </footer>
    </div>
  </div>
</template>
