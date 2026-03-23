<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { SITE } from '../config/site'
import './Home.css'

const heroStyle = computed(() => {
  if (!SITE.heroImage) return undefined
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = SITE.heroImage.startsWith('/') ? SITE.heroImage.slice(1) : SITE.heroImage
  const url = `${base}/${path}`
  return {
    backgroundImage: `linear-gradient(160deg, rgba(12,12,13,0.88), rgba(12,12,13,0.55)), url(${url})`,
  }
})
</script>

<template>
  <div class="home">
    <p class="home__eyebrow">Portfolio</p>
    <section class="home__hero" :style="heroStyle">
      <div class="home__hero-inner">
        <h1 class="home__name">{{ SITE.name }}</h1>
        <div class="home__taglines" aria-label="소개 태그라인">
          <span v-for="line in SITE.taglines" :key="line" class="home__tagline">
            {{ line }}
          </span>
        </div>
        <p class="home__intro">{{ SITE.shortIntro }}</p>
        <RouterLink class="home__cta" to="/project">프로젝트 보기</RouterLink>
      </div>
    </section>
  </div>
</template>
