<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { projects } from '../data/projects'
import './Project.css'
</script>

<template>
  <div class="project-page">
    <header class="project-page__header">
      <h1 class="project-page__title">Project</h1>
      <p class="project-page__lead">
        진행했던 프로젝트를 카드로 정리했습니다. 내용은 <code>src/data/projects.ts</code> 에서 수정할 수
        있습니다.
      </p>
    </header>

    <ul class="project-grid">
      <li v-for="p in projects" :key="p.id" class="project-card">
        <h2 class="project-card__title">{{ p.title }}</h2>
        <p class="project-card__desc">{{ p.description }}</p>
        <ul class="project-card__stack">
          <li v-for="s in p.stack" :key="s">{{ s }}</li>
        </ul>
        <div class="project-card__links">
          <RouterLink v-if="p.demoRoute" :to="{ name: p.demoRoute }">Demo</RouterLink>
          <a v-else-if="p.demoUrl" :href="p.demoUrl" target="_blank" rel="noreferrer">Demo</a>
          <a v-if="p.repoUrl" :href="p.repoUrl" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </li>
    </ul>
  </div>
</template>
