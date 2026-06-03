import { apiFetch } from '@/lib/stClient'
import type { Device, ListResponse } from '@/lib/types'

/**
 * speechSynthesis(speak) 또는 audioNotification 을 지원하는 디바이스(스피커) 목록.
 * SmartThings 의 /devices 는 capability 쿼리를 여러 개 반복(OR) 으로 받을 수 있다.
 * 공용 listDevices 헬퍼는 capability 반복 파라미터를 표현하지 못해 여기서 직접 구성한다.
 */
export function listSpeakers(): Promise<ListResponse<Device>> {
  const qs = new URLSearchParams()
  qs.append('capability', 'speechSynthesis')
  qs.append('capability', 'audioNotification')
  return apiFetch<ListResponse<Device>>(`/devices?${qs.toString()}`)
}

/** 디바이스 명령 응답(상태 트래킹용). 필드는 느슨하게 허용. */
export interface CommandResponse {
  results?: { id?: string; status?: string }[]
  [key: string]: unknown
}

/**
 * 단일 디바이스의 main 컴포넌트 speechSynthesis.speak 명령으로 메시지를 전송한다.
 */
export function speak(deviceId: string, message: string): Promise<CommandResponse | null> {
  const body = JSON.stringify({
    commands: [
      {
        component: 'main',
        capability: 'speechSynthesis',
        command: 'speak',
        arguments: [message],
      },
    ],
  })
  return apiFetch<CommandResponse | null>(`/devices/${deviceId}/commands`, {
    method: 'POST',
    body,
  })
}
