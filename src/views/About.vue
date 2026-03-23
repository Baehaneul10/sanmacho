<script setup lang="ts">
import './PageSection.css'
</script>

<template>
  <article class="page-section">
    <h1 class="page-section__title">About Me</h1>
    <p class="page-section__lead"></p>

    <section class="page-section__block">
      <p>안녕하세요 배하늘입니다. 포트폴리오를 봐주셔서 감사합니다 :)</p>
    </section>

    <section class="page-section__block">
      <h2>기술 스택</h2>
      <ul class="page-section__tags">
        <li>Vue 3</li>
        <li>TypeScript</li>
        <li>Pinia</li>
        <li>HTML / CSS</li>
        <li>MariaDB</li>
        <li>Nginx</li>
        <li>Git</li>
      </ul>
    </section>

    <section class="page-section__block">
      <h2>경력</h2>
      <p>2025.12 ~ 2026.03 (주)챔프스터디</p>
      <p>2024.03 ~ 2025.06 (주)코어솔루션</p>
      <p>2023.10 ~ 2024.01 전북은행 인턴</p>
      <p>2022.08 ~ 2022.12 케이스타일즈 인턴</p>
      &nbsp;

      <h2>활동</h2>
      <p>2023.05 ~ 2023.08 제이비잡앤 컨설팅</p>
    </section>
  </article>
</template>
