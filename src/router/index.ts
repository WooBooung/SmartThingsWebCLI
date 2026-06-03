import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/device', name: 'device', component: () => import('@/views/DeviceView.vue') },
    { path: '/capability', name: 'capability', component: () => import('@/views/CapabilityView.vue') },
    // 점진 이식: 새 도구 라우트를 여기에 추가
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
