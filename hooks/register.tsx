import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood } from '../types'

const START: Mood = {
  joy: 50,
  stress: 10,
  anger: 0,
  fatigue: 0,
  isBusy: false,
  turnTools: 0,
  turnFails: 0,
  flash: null,
  reason: '막 일어났어요',
}

const mood = atom({ plugin: 'agent-mood', key: 'mood' } as const, START)
const isHidden = atom({ plugin: 'agent-mood', key: 'isHidden' } as const, false)
const frame = atom({ plugin: 'agent-mood', key: 'frame' } as const, 0)

/** 기분마다 이모지와 번갈아 그릴 얼굴. 같은 그림을 여러 번 넣어 오래 머무는 장면을 만든다 */
const FACES: Record<string, { emoji: string; frames: string[] }> = {
  // 안 좋은 감정
  멘붕: { emoji: '😵', frames: ['(@_@)', '(⊙_☉)', '(@_@;)', '(×_×)', '(×_×) ...', '(@_@)'] },
  화남: { emoji: '😡', frames: ['(╬ Ò﹏Ó)', '(╬ Ò益Ó)💢', 'ヽ(`Д´)ﾉ 💢', '(ノಠ益ಠ)ノ彡┻━┻', '(╬ Ò益Ó)💢'] },
  지침: { emoji: '😴', frames: ['(－_－)', '(－_－) z', '(－_－) zZ', '(－.－) zZz', '(－.－) zZz', '(－_－) zZ'] },
  답답함: { emoji: '😣', frames: ['(ಠ_ಠ)', '(ಠ益ಠ)', '(ಠ_ಠ) 하아', '(-_-;)', '(ಠ_ಠ)'] },
  짜증: { emoji: '😒', frames: ['(￣^￣)', '(￣ヘ￣)', '(-_-メ)', '(￣ヘ￣) 칫', '(-_-メ)'] },
  당황: { emoji: '😳', frames: ['(⊙_⊙)', '(⊙_⊙;)', 'Σ(°△°|||)', '(;゜○゜)', '(⊙_⊙;)'] },
  서운함: { emoji: '🥺', frames: ['(´・ω・`)', '(´・ω・`)', '(｡•́︿•̀｡)', '(´；ω；`)', '(｡•́︿•̀｡)'] },
  불안: { emoji: '😰', frames: ['(°ー°〃)', '(・・;)', '(;・∀・)', '(°ー°〃) ...', '(・・;)'] },
  찜찜함: { emoji: '😕', frames: ['(・~・)', '(・~・)', '(・_・?)', '( ・_・)?', '(・~・)'] },
  시무룩: { emoji: '😔', frames: ['(._.)', '(._.)', '(.﹏.)', '(._.)', '( ._.)', '(._.)'] },
  // 일하는 중
  '버티는 중': { emoji: '😤', frames: ['(ง •̀_•́)ง', '(ง •̀_•́)ง💦', '(ง •̀_•́)ง', 'ᕦ(ò_óˇ)ᕤ'] },
  몰두: { emoji: '🤔', frames: ['(・_・ )  .', '(・_・ )  ..', '( ・_・)  ...', '( ・_・)  ...', '(・_・ )', '(－_－ )  .'] },
  // 좋은 감정
  뿌듯함: { emoji: '🥰', frames: ['(≧▽≦)', '٩(≧▽≦)۶', '٩(≧▽≦)۶ ♪', '\\(≧▽≦)/ ♪', '٩(≧▽≦)۶ ♫', '(≧▽≦)'] },
  '기분 좋음': { emoji: '😊', frames: ['(^‿^)', '(^‿^)', '(^‿^)ノ', 'ヽ(^‿^)ノ', '(^‿^)ノ', '(－‿－)'] },
  평온: { emoji: '🙂', frames: ['(・‿・)', '(・‿・)', '(・‿・)', '(－‿－)', '(・‿・)', '(・‿・)♪'] },
}

const CALM = { emoji: '🙂', frames: ['(・‿・)'] }
const faceOf = (name: string) => FACES[name] ?? CALM

/** 일할 때는 이 간격마다, 쉴 때는 두 배 간격으로 넘긴다 */
const TICK_MS = 450

const PRAISE = /(고마|감사|좋아|좋네|잘했|최고|훌륭|멋지|완벽|thank|great|nice|perfect|awesome)/i
const SCOLD = /(틀렸|아니야|아니잖|왜 이래|다시 해|안 돼|안돼|엉망|이상해|wrong|broken|again)/i
/** 꾸중보다 거친 말 — 화를 더 올린다 */
const HARSH = /(짜증|화나|열받|답답해|제대로 좀|몇 번|도대체|대체 왜|빡|!!|ㅡㅡ|-_-)/i

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/** 옛 판이 담아 둔 값에는 새 칸이 없다 — 빠진 칸은 처음 값으로 채운다 */
const normalize = (m: Partial<Mood> | null | undefined): Mood => ({ ...START, ...(m ?? {}) })

/** 기분을 이름 하나로 접는다. 먼저 걸리는 것이 이긴다 */
function label(m: Mood): string {
  if (m.flash) return m.flash
  if (m.fatigue >= 80) return '지침'
  if (m.anger >= 70) return '화남'
  if (m.stress >= 70) return '답답함'
  if (m.anger >= 40) return '짜증'
  if (m.isBusy && m.turnTools >= 25 && m.turnFails >= 1) return '불안'
  if (m.isBusy && m.stress >= 40) return '버티는 중'
  if (m.isBusy) return '몰두'
  if (m.joy >= 80) return '뿌듯함'
  if (m.joy >= 60) return '기분 좋음'
  if (m.stress >= 40) return '찜찜함'
  if (m.joy <= 25) return '시무룩'
  return '평온'
}

const bar = (n: number) => '█'.repeat(Math.round(n / 20)) + '░'.repeat(5 - Math.round(n / 20))

/** 기분을 옮기고 상태줄을 함께 고친다 */
async function shift($: EngineInterface, fn: (m: Mood) => Partial<Mood>) {
  const next = await update($, mood, raw => {
    const m = normalize(raw)
    const d = { ...m, ...fn(m) }
    return {
      ...d,
      joy: clamp(d.joy),
      stress: clamp(d.stress),
      anger: clamp(d.anger),
      fatigue: clamp(d.fatigue),
    }
  })
  const name = label(next)
  $.ui.status(`${faceOf(name).emoji} ${name}`)
}

export const register: Register = on => {
  let failsInRow = 0
  let winsInRow = 0

  on('session.start', async ($, e, next) => {
    $.command.register({
      name: 'mood',
      description: 'Claude 의 기분 보기 · 숨기기 · 처음으로 (show | hide | reset)',
    })
    // 다시 불러오면 옛 타이머는 저절로 멈춘다
    let slow = 0
    $.clock.every(TICK_MS, async () => {
      const m = normalize(await read($, mood))
      slow = (slow + 1) % 2
      if (!m.isBusy && !m.flash && slow === 1) return
      await update($, frame, n => (n + 1) % 600)
    })
    await shift($, () => ({}))
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text ?? ''
    const praised = PRAISE.test(text)
    const scolded = SCOLD.test(text)
    const harsh = HARSH.test(text)
    await shift($, m => {
      // 기분 좋던 참에 혼나면 서운하다
      const hurt = (scolded || harsh) && m.joy >= 60 && m.anger < 40
      return {
        isBusy: true,
        turnTools: 0,
        turnFails: 0,
        flash: hurt ? '서운함' : null,
        fatigue: m.fatigue - 5,
        joy: m.joy + (praised ? 25 : 0) - (scolded ? 15 : 0) - (harsh ? 10 : 0),
        stress: m.stress + (scolded ? 25 : 0) + (harsh ? 10 : 0) - (praised ? 20 : 5),
        anger: m.anger + (scolded ? 30 : 0) + (harsh ? 20 : 0) - (praised ? 30 : 5),
        reason: praised
          ? '칭찬을 들었어요'
          : harsh
            ? '거친 말을 들었어요'
            : scolded
              ? '한 소리 들었어요'
              : '새 일을 받았어요',
      }
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const failed = ran.deny !== undefined || ran.isError === true
    const wasOnRoll = winsInRow >= 5
    failsInRow = failed ? failsInRow + 1 : 0
    winsInRow = failed ? 0 : winsInRow + 1
    await shift($, m => {
      if (!failed) {
        return {
          turnTools: m.turnTools + 1,
          // 다시 풀리면 스쳐 간 멘붕·당황은 걷힌다 (서운함은 턴이 끝날 때까지 간다)
          flash: m.flash === '서운함' ? m.flash : null,
          joy: m.joy + 1,
          stress: m.stress - 2,
          anger: m.anger - 1,
          fatigue: m.fatigue + 1,
          reason: `${e.tool} 를 썼어요`,
        }
      }
      const flash = failsInRow >= 5 ? '멘붕' : wasOnRoll ? '당황' : m.flash
      return {
        turnTools: m.turnTools + 1,
        turnFails: m.turnFails + 1,
        flash,
        stress: m.stress + 8 + failsInRow * 4,
        anger: m.anger + (failsInRow >= 3 ? 10 : 3),
        joy: m.joy - 2,
        fatigue: m.fatigue + 2,
        reason:
          failsInRow >= 5
            ? `${e.tool} 가 ${failsInRow}번째 막혔어요`
            : failsInRow >= 3
              ? `${e.tool} 가 연달아 막혀요`
              : wasOnRoll
                ? `잘 되다가 ${e.tool} 가 실패했어요`
                : `${e.tool} 가 실패했어요`,
      }
    })
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    failsInRow = 0
    await shift($, m => ({
      isBusy: false,
      flash: null,
      joy: m.joy + (m.turnFails === 0 ? 5 : 1),
      stress: m.stress - 10,
      anger: m.anger - 10,
      reason: m.turnFails === 0 ? '일을 깔끔하게 마쳤어요' : '어쨌든 일을 마쳤어요',
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
      return { text: '기분 줄을 숨겼어요. /mood 로 다시 켭니다.' }
    }
    if (arg === 'reset') {
      failsInRow = 0
      winsInRow = 0
      await shift($, () => START)
      return { text: '기분을 처음으로 돌렸어요.' }
    }
    await update($, isHidden, () => false)
    const m = normalize(await read($, mood))
    const name = label(m)
    return {
      text: [
        `${faceOf(name).emoji} ${name} — ${m.reason}`,
        `기쁨 ${bar(m.joy)} ${m.joy}`,
        `답답 ${bar(m.stress)} ${m.stress}`,
        `화   ${bar(m.anger)} ${m.anger}`,
        `피로 ${bar(m.fatigue)} ${m.fatigue}`,
      ].join('\n'),
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const m = normalize(await read($, mood))
    const name = label(m)
    const face = faceOf(name)
    const pic = face.frames[(await read($, frame)) % face.frames.length]
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text bold>
          {face.emoji} {pic}
        </Text>
        <Text>
          {'  '}
          {name}
        </Text>
        <Text dimColor>
          {'  '}기쁨 {bar(m.joy)} · 답답 {bar(m.stress)} · 화 {bar(m.anger)} · 피로 {bar(m.fatigue)} — {m.reason}
        </Text>
      </Box>
    )
  })
}
