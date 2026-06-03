<script setup lang="ts">
import { useRouter } from 'vue-router'
import { TOOLS } from '@/lib/tools'

const router = useRouter()
</script>

<template>
  <section class="hero-glow -mx-5 -mt-8 mb-8 px-5 pt-12 pb-10">
    <div class="mx-auto max-w-[960px]">
      <span
        class="inline-block rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-xs text-brand-2"
      >
        SmartThings 개발자 도구
      </span>
      <h1 class="mt-4 text-3xl font-extrabold tracking-tight md:text-[44px] md:leading-[1.15]">
        Web CLI
      </h1>
      <p class="mt-3 max-w-[640px] text-base text-muted md:text-lg">
        SmartThings API 를 브라우저에서 바로 다루는 도구 모음. PAT 토큰을 설정하고 원하는 도구를
        선택하세요.
      </p>
    </div>
  </section>

  <div class="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
    <button
      v-for="tool in TOOLS"
      :key="tool.key"
      :disabled="!tool.enabled"
      class="group flex flex-col rounded-2xl border p-6 text-left transition"
      :class="
        tool.enabled
          ? 'cursor-pointer border-brand-2/30 bg-gradient-to-br from-brand/10 to-brand-2/[0.04] hover:-translate-y-0.5 hover:border-brand-2'
          : 'cursor-not-allowed border-line bg-card opacity-50'
      "
      @click="tool.enabled && router.push(tool.path)"
    >
      <h3 class="text-lg font-bold">
        {{ tool.title }}
        <span v-if="!tool.enabled" class="ml-1 text-xs font-normal text-muted">(준비 중)</span>
      </h3>
      <p class="mt-2 text-sm text-muted">{{ tool.desc }}</p>
    </button>
  </div>
</template>
