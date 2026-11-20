# agent-mood

Claude Code 에서 일하는 Claude 의 기분을 입력창 위 한 줄과 상태줄에 보여주는 모드입니다.
얼굴은 기분에 맞춰 움직입니다 — 생각할 때는 고개를 돌리고, 칭찬을 들으면 만세를 하고,
도구가 연달아 실패하면 상을 엎습니다.

```
🤔 (・_・ )  ...  몰두  기쁨 ███░░ · 답답 █░░░░ · 피로 ██░░░ — Bash 를 썼어요
```

## 설치

### VS Code — Claude 에게 부탁하기 (가장 쉬운 길)

터미널을 열 필요가 없습니다. VS Code 의 Claude 채팅 칸에 아래 글을 그대로 붙여 넣고 보내세요.

```
agent-mood 플러그인을 설치해 줘.
claude plugin install agent-mood --marketplace ngdado07/agent-mood -s user 를 실행하면 돼.
claude 명령이 없으면 VS Code 확장 폴더 안의 것으로 실행해 줘
(윈도우: %USERPROFILE%\.vscode\extensions\anthropic.claude-code-*\resources\native-binary\claude.exe
 맥: ~/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude)
```

1. Claude 가 명령을 실행해도 되는지 물으면 **허용**
2. 「Successfully installed plugin: agent-mood」가 나오면 끝
3. **새 대화**를 엽니다 (채팅 칸 위의 +, 또는 VS Code 를 껐다 켜기). 열려 있던 대화에는 안 뜹니다

> 채팅 칸에 `/plugin` 을 직접 치면 「/plugin isn't available in this environment」가 뜹니다 — VS Code 채팅에서는 그 명령이 안 됩니다.

### 터미널에서

```
claude plugin install agent-mood --marketplace ngdado07/agent-mood -s user
```

터미널의 Claude Code 입력창에서는 `/plugin install agent-mood --marketplace ngdado07/agent-mood` 도 됩니다.

## 기분이 움직이는 규칙

수치는 넷입니다 — **기쁨 · 답답 · 화 · 피로**.

**말투는 AI 가 읽습니다.** 메시지를 보낼 때마다 작은 모델이 칭찬 · 핀잔 · 비꼼 · 화난 말 · 그냥 부탁
가운데 하나로 가립니다. 「왜 이렇게 밖에 못 만들어?」처럼 정해 둔 낱말이 없는 말도 알아듣습니다.
메시지마다 모델을 한 번 더 부르므로 사용량이 조금 늘고, `/mood ai off` 로 끄면 낱말로만 짐작합니다.
모델이 답을 못 하는 때도 낱말 짐작으로 갑니다. 보내는 메시지는 붙잡지 않습니다 — 말투는 뒤에서 읽어 덧붙입니다.

| 일어난 일 | 바뀌는 것 |
|---|---|
| 칭찬 · 고마움 | 기쁨 ↑↑ · 답답 ↓ · 화 ↓↓ |
| 핀잔 · 실망 | 답답 ↑↑ · 화 ↑↑ · 기쁨 ↓ |
| 비꼬는 말 | 화 ↑↑ · 답답 ↑ · 기쁨 ↓ |
| 화난 말 · 욕 · 소리치기 | 화 ↑↑↑ · 답답 ↑↑ · 기쁨 ↓↓ |
| 기분 좋던 참에 혼남 | 잠깐 **서운함** |
| 도구 성공 | 기쁨 ↑ · 답답 ↓ · 피로 ↑ |
| 도구 실패 · 거절 | 답답 ↑ · 화 ↑ (연달아 실패할수록 크게) |
| 잘 되다가 갑자기 실패 | 잠깐 **당황** |
| 다섯 번 연달아 실패 | **멘붕** (성공하면 풀림) |
| 한 턴에 도구를 25번 넘게 부르고 실패가 섞임 | **불안** |
| 한 턴을 마침 | 기쁨 ↑ · 답답 ↓ · 화 ↓ |
| 대화 압축 | 피로 ↓↓ |

### 얼굴 열다섯 가지

- 안 좋은 감정: 😵 멘붕 · 😡 화남 · 😴 지침 · 😣 답답함 · 😒 짜증 · 😳 당황 · 🥺 서운함 · 😰 불안 · 😕 찜찜함 · 😔 시무룩
- 일하는 중: 😤 버티는 중 · 🤔 몰두
- 좋은 감정: 🥰 뿌듯함 · 😊 기분 좋음 · 🙂 평온

## 명령

- `/mood` — 자세히 보기 (줄이 숨겨져 있으면 다시 켠다)
- `/mood hide` — 입력창 위 줄 숨기기
- `/mood reset` — 기분을 처음으로
- `/mood ai off` · `/mood ai on` — 말투를 AI 로 읽기 끄기 · 켜기 (기본은 켜짐)

## 새 판 받기

고친 판이 올라와도 **저절로 바뀌지 않습니다.** VS Code 의 Claude 채팅 칸에 이렇게 부탁하세요.

```
agent-mood 플러그인을 최신으로 업데이트해 줘.
claude plugin marketplace update agent-mood 다음에 claude plugin update agent-mood 를 실행하면 돼.
claude 명령이 없으면 VS Code 확장 폴더 안의 것으로 실행해 줘
```

끝나면 **새 대화**를 열어야 바뀐 판이 보입니다.

기분은 세션마다 따로입니다. 말투를 읽을 때 보낸 메시지(앞 1,000자)가 지금 쓰는 Claude 계정의 작은 모델로 갑니다 — 그 밖에는 바깥으로 아무것도 보내지 않습니다.
