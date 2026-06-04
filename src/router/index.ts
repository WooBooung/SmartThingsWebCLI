import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // hash 모드: 정적 호스팅에서 nginx 설정/프록시 없이 새로고침·딥링크 동작 (URL = /#/device)
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    // Apps & Schema
    { path: '/apps', name: 'apps', component: () => import('@/views/AppsView.vue') },
    { path: '/installedapps', name: 'installedapps', component: () => import('@/views/InstalledAppsView.vue') },
    { path: '/schema', name: 'schema', component: () => import('@/views/SchemaView.vue') },
    { path: '/installedschema', name: 'installedschema', component: () => import('@/views/InstalledSchemaView.vue') },
    { path: '/schema-invites', name: 'schema-invites', component: () => import('@/views/SchemaInvitesView.vue') },
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
