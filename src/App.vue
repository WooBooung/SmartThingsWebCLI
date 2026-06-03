<script setup lang="ts">
import { ref } from 'vue'
import AppNav from '@/components/AppNav.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import TokenDialog from '@/components/TokenDialog.vue'
import ToastHost from '@/components/ToastHost.vue'

const menuOpen = ref(false)
const tokenOpen = ref(false)
</script>

<template>
  <AppNav
    :menu-open="menuOpen"
    @toggle-menu="menuOpen = !menuOpen"
    @open-token="tokenOpen = true"
  />
  <AppSidebar :open="menuOpen" @navigate="menuOpen = false" />

  <!-- 모바일 사이드바 backdrop -->
  <div
    v-if="menuOpen"
    class="fixed inset-0 top-14 z-20 bg-black/50 md:hidden"
    @click="menuOpen = false"
  />

  <main class="px-5 py-8 md:ml-60">
    <div class="mx-auto max-w-[960px]">
      <RouterView />
    </div>
  </main>

  <TokenDialog :open="tokenOpen" @close="tokenOpen = false" />
  <ToastHost />
</template>
