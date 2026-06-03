import { reactive } from 'vue'

export type ToastKind = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const state = reactive<{ items: Toast[] }>({ items: [] })
let seq = 0

export function useToasts() {
  return state
}

export function pushToast(message: string, kind: ToastKind = 'info', timeoutMs = 4000) {
  const id = ++seq
  state.items.push({ id, kind, message })
  if (timeoutMs > 0) {
    window.setTimeout(() => dismissToast(id), timeoutMs)
  }
  return id
}

export function dismissToast(id: number) {
  const i = state.items.findIndex((t) => t.id === id)
  if (i >= 0) state.items.splice(i, 1)
}

export const toastError = (m: string) => pushToast(m, 'error', 6000)
export const toastSuccess = (m: string) => pushToast(m, 'success')
