import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'agent-mood',
  component: 'AbovePrompt',
  props: { hasSurvey: false },
} as const

/** 엔진이 할 일을 대신 답하고, 시계와 상태를 메모리에 둔다 */
function engine(on: Parameters<Parameters<typeof test>[1]>[1], tone: string | undefined) {
  const clock = mock.clock(on)
  on('command.register', () => ({ value: { command: 'mood' } as never }))
  on('ui.status', () => ({ value: undefined as never }))
  on('session.start', (_, e) => ({ cwd: e.cwd }) as never)
  on('prompt.submit', (_, e) => e as never)
  on('model.classify', () => ({ value: tone as never }))
  return clock
}

async function bandText($: Parameters<Parameters<typeof test>[1]>[0]) {
  const ui = await $.ui.mount({ ...BAND, surface: 'vscode' } as never)
  const texts = await ui.findAll({ type: 'Text' })
  await ui.unmount()
  return texts.map(t => t.text).join(' ')
}

test('낱말이 없는 핀잔도 AI 가 비꼼으로 읽으면 화가 오른다', async ($, on) => {
  const clock = engine(on, 'sarcasm')
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true } as never)
  await $.prompt.submit({ text: '왜 이렇게 밖에 못만들어?' } as never)
  await clock.settle()
  expect(await bandText($)).toMatch(/비꼬는 말을 들었어요/)
})

test('화난 말을 두 번 들으면 화남', async ($, on) => {
  const clock = engine(on, 'angry')
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true } as never)
  await $.prompt.submit({ text: '짜증나네 진짜' } as never)
  await clock.settle()
  await $.prompt.submit({ text: '아 진짜 짜증나' } as never)
  await clock.settle()
  expect(await bandText($)).toMatch(/화남/)
})

test('모델이 답을 못 하면 낱말 짐작으로 간다', async ($, on) => {
  const clock = engine(on, undefined)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true } as never)
  await $.prompt.submit({ text: '고마워 잘했어' } as never)
  await clock.settle()
  expect(await bandText($)).toMatch(/칭찬을 들었어요/)
})
