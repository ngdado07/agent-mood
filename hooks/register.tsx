import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood } from '../types'

const START: Mood = { joy: 50, stress: 10, fatigue: 0, isBusy: false, reason: '막 일어났어요' }

const mood = atom({ plugin: 'agent-mood', key: 'mood' } as const, START)
const isHidden = atom({ plugin: 'agent-mood', key: 'isHidden' } as const, false)

const frame = atom({ plugin: 'agent-mood', key: 'frame' } as const, 0)

/** 기분마다 번갈아 그릴 얼굴. 같은 그림을 여러 번 넣어 오래 머무는 장면을 만든다 */
const FRAMES: Record<string, string[]> = {
  지침: ['(－_－)   ', '(－_－) z ', '(－_－) zZ', '(－.－) zZz', '(－.－) zZz', '(－_－) zZ'],
  답답함: ['(ಠ_ಠ)    ', '(ಠ益ಠ)   ', '(╬ಠ益ಠ)  ', '(╯°□°)╯ ', '(╯°□°)╯︵┻━┻', '(ಠ_ಠ)    '],
  '버티는 중': ['(ง •̀_•́)ง ', '(ง •̀_•́)ง💦', '(ง •̀_•́)ง ', 'ᕦ(ò_óˇ)ᕤ '],
  몰두: ['(・_・ )  .  ', '(・_・ )  .. ', '( ・_・)  ...', '( ・_・)  ...', '(・_・ )     ', '(－_－ )  .  '],
  뿌듯함: ['(≧▽≦)   ', '٩(≧▽≦)۶ ', '٩(≧▽≦)۶ ♪', '\(≧▽≦)/ ♪', '٩(≧▽≦)۶ ♫', '(≧▽≦)   '],
  '기분 좋음': ['(^‿^)  ', '(^‿^)  ', '(^‿^)ノ', 'ヽ(^‿^)ノ', '(^‿^)ノ', '(－‿－) '],
  찜찜함: ['(・~・)  ', '(・~・)  ', '(・_・?) ', '( ・_・)? ', '(・~・)  '],
  시무룩: ['(._.)  ', '(._.)  ', '(.﹏.)  ', '(._.)  ', '( ._.) ', '(._.)  '],
  평온: ['(・‿・) ', '(・‿・) ', '(・‿・) ', '(－‿－) ', '(・‿・) ', '(・‿・)♪'],
}

/** 일할 때는 빨리, 쉴 때는 천천히 넘긴다 */
const TICK_MS = 450

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

const PRAISE = /(고마|감사|좋아|좋네|잘했|최고|훌륭|멋지|완벽|thank|great|nice|perfect|awesome)/i
const SCOLD = /(틀렸|아니야|아니잖|왜 이래|다시 해|안 돼|안돼|엉망|이상해|wrong|broken|again)/i

/** 기분 셋을 얼굴 하나로 접는다. 먼저 걸리는 것이 이긴다 */
function face(m: Mood): { emoji: string; label: string } {
  if (m.fatigue >= 80) return { emoji: '😴', label: '지침' }
  if (m.stress >= 70) return { emoji: '😣', label: '답답함' }
  if (m.isBusy && m.stress >= 40) return { emoji: '😤', label: '버티는 중' }
  if (m.isBusy) return { emoji: '🤔', label: '몰두' }
  if (m.joy >= 80) return { emoji: '🥰', label: '뿌듯함' }
  if (m.joy >= 60) return { emoji: '😊', label: '기분 좋음' }
  if (m.stress >= 40) return { emoji: '😕', label: '찜찜함' }
  if (m.joy <= 25) return { emoji: '😔', label: '시무룩' }
  return { emoji: '🙂', label: '평온' }
}

const bar = (n: number) => '█'.repeat(Math.round(n / 20)) + '░'.repeat(5 - Math.round(n / 20))

/** 기분을 옮기고 상태줄을 함께 고친다 */
async function shift($: EngineInterface, fn: (m: Mood) => Partial<Mood>) {
  const next = await update($, mood, m => {
    const d = { ...m, ...fn(m) }
    return { ...d, joy: clamp(d.joy), stress: clamp(d.stress), fatigue: clamp(d.fatigue) }
  })
  const f = face(next)
  $.ui.status(`${f.emoji} ${f.label}`)
}

export const register: Register = on => {
  let failsInRow = 0

  on('session.start', async ($, e, next) => {
    // 다시 불러오면 옛 타이머는 저절로 멈춘다
    let slow = 0
    $.clock.every(TICK_MS, async () => {
      const m = await read($, mood)
      // 쉴 때는 두 번에 한 번만 넘긴다
      slow = (slow + 1) % 2
      if (!m.isBusy && slow === 1) return
      await update($, frame, n => (n + 1) % 600)
    })
    $.command.register({ name: 'mood', description: 'Claude 의 기분 보기 · 숨기기 · 처음으로 (show | hide | reset)' })
    const m = await read($, mood)
    const f = face(m)
    $.ui.status(`${f.emoji} ${f.label}`)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text ?? ''
    const praised = PRAISE.test(text)
    const scolded = SCOLD.test(text)
    await shift($, m => ({
      isBusy: true,
      // 새 일을 받으면 조금 쉰 셈이다
      fatigue: m.fatigue - 5,
      joy: m.joy + (praised ? 25 : 0) - (scolded ? 15 : 0),
      stress: m.stress + (scolded ? 25 : 0) - (praised ? 20 : 5),
      reason: praised ? '칭찬을 들었어요' : scolded ? '한 소리 들었어요' : '새 일을 받았어요',
    }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const failed = ran.deny !== undefined || ran.isError === true
    failsInRow = failed ? failsInRow + 1 : 0
    await shift($, m =>
      failed
        ? {
            stress: m.stress + 8 + failsInRow * 4,
            fatigue: m.fatigue + 2,
            reason: failsInRow >= 3 ? `${e.tool} 가 연달아 막혀요` : `${e.tool} 가 실패했어요`,
          }
        : {
            joy: m.joy + 1,
            stress: m.stress - 2,
            fatigue: m.fatigue + 1,
            reason: `${e.tool} 를 썼어요`,
          },
    )
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    await shift($, m => ({
      isBusy: false,
      joy: m.joy + 5,
      stress: m.stress - 10,
      reason: '일을 마쳤어요',
    }))
    return out
  })

  on('session.compact', async ($, e, next) => {
    const out = await next(e)
    await shift($, m => ({ fatigue: m.fatigue - 40, reason: '머리를 정리했어요' }))
    return out
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'mood' }, async ($, e) => {
    const arg = (e.args ?? '').trim()
    if (arg === 'hide') {
      await update($, isHidden, () => true)
      return { text: '기분 줄을 숨겼어요. /mood show 로 다시 켭니다.' }
    }
    if (arg === 'reset') {
      await shift($, () => START)
      return { text: '기분을 처음으로 돌렸어요.' }
    }
    await update($, isHidden, () => false)
    const m = await read($, mood)
    const f = face(m)
    return {
      text: `${f.emoji} ${f.label} — ${m.reason}\n기쁨 ${bar(m.joy)} ${m.joy}\n답답 ${bar(m.stress)} ${m.stress}\n피로 ${bar(m.fatigue)} ${m.fatigue}`,
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const m = await read($, mood)
    const f = face(m)
    const pics = FRAMES[f.label] ?? [f.emoji]
    const pic = pics[(await read($, frame)) % pics.length]
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text bold>
          {f.emoji} {pic}
        </Text>
        <Text>
          {' '}{f.label}
        </Text>
        <Text dimColor>
          {'  '}기쁨 {bar(m.joy)} · 답답 {bar(m.stress)} · 피로 {bar(m.fatigue)} — {m.reason}
        </Text>
      </Box>
    )
  })
}
