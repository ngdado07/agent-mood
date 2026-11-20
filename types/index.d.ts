export type Mood = {
  /** 기쁨 0~100 — 칭찬·성공이 올린다 */
  joy: number
  /** 답답함 0~100 — 실패·막힘·꾸중이 올린다 */
  stress: number
  /** 피로 0~100 — 도구를 부를수록 쌓이고 쉬면 준다 */
  fatigue: number
  /** 지금 일하는 중인가 */
  isBusy: boolean
  /** 마지막으로 기분을 움직인 일 */
  reason: string
}

declare module 'claude-code' {
  interface PluginState {
    'agent-mood': { mood: Mood; isHidden: boolean; frame: number }
  }
}
