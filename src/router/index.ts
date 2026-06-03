import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    // Virtual Device
    { path: '/virtual', name: 'virtual', component: () => import('@/views/VirtualView.vue') },
    { path: '/events', name: 'events', component: () => import('@/views/EventsView.vue') },
    // Devices
    { path: '/device', name: 'device', component: () => import('@/views/DeviceView.vue') },
    { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
    { path: '/configuration', name: 'configuration', component: () => import('@/views/ConfigurationView.vue') },
    { path: '/presentation', name: 'presentation', component: () => import('@/views/PresentationView.vue') },
    // Capability
    { path: '/capability', name: 'capability', component: () => import('@/views/CapabilityView.vue') },
    { path: '/capability-presentation', name: 'capability-presentation', component: () => import('@/views/CapabilityPresentationView.vue') },
    { path: '/capability-generator', name: 'capability-generator', component: () => import('@/views/CapabilityGeneratorView.vue') },
    // Edge Drivers
    { path: '/edge', name: 'edge', component: () => import('@/views/EdgeView.vue') },
    { path: '/channels', name: 'channels', component: () => import('@/views/ChannelsView.vue') },
    { path: '/drivers', name: 'drivers', component: () => import('@/views/DriversView.vue') },
    { path: '/hublog', name: 'hublog', component: () => import('@/views/HubLogView.vue') },
    // 기타
    { path: '/tts', name: 'tts', component: () => import('@/views/TtsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
