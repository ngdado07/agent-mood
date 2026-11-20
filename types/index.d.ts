export type Mood = {
  /** 기쁨 0~100 — 칭찬·성공이 올린다 */
  joy: number
  /** 답답함 0~100 — 실패·막힘·꾸중이 올린다 */
  stress: number
  /** 화 0~100 — 꾸중·거친 말·연달은 실패가 올린다 */
  anger: number
  /** 피로 0~100 — 도구를 부를수록 쌓이고 쉬면 준다 */
  fatigue: number
  /** 지금 일하는 중인가 */
  isBusy: boolean
  /** 이번 턴에 부른 도구 수 */
  turnTools: number
  /** 이번 턴에 실패한 도구 수 */
  turnFails: number
  /** 잠깐 스쳐 가는 감정(멘붕·당황·서운함). 없으면 null */
  flash: string | null
  /** 마지막으로 기분을 움직인 일 */
  reason: string
}

declare module 'claude-code' {
  interface PluginState {
    'agent-mood': { mood: Mood; isHidden: boolean; frame: number }
  }
}
