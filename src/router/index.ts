import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/Home.vue'),
        },
        {
          path: 'about',
          name: 'about',
          component: () => import('../views/About.vue'),
        },
        {
          path: 'project',
          name: 'project',
          component: () => import('../views/Project.vue'),
        },
        {
          path: 'board',
          name: 'board',
          component: () => import('../views/Board.vue'),
        },
        {
          path: 'reaction-game',
          name: 'reaction-game',
          component: () => import('../views/ReactionGame.vue'),
        },
        {
          path: 'spending-city',
          name: 'spending-city',
          component: () => import('../views/SpendingGame.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
