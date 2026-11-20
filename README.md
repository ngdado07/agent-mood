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

| 일어난 일 | 바뀌는 것 |
|---|---|
| 도구 성공 | 기쁨 +1 · 답답 −2 · 피로 +1 |
| 도구 실패 · 거절 | 답답 상승 (연달아 실패할수록 크게) |
| 「고마워 · 좋아 · 잘했어 · thanks」 | 기쁨 +25 · 답답 −20 |
| 「틀렸어 · 다시 해 · 안 돼 · wrong」 | 답답 +25 · 기쁨 −15 |
| 한 턴을 마침 | 기쁨 +5 · 답답 −10 |
| 대화 압축 | 피로 −40 |

세 수치를 얼굴 하나로 접습니다: 😴 지침 · 😣 답답함 · 😤 버티는 중 · 🤔 몰두 · 🥰 뿌듯함 ·
😊 기분 좋음 · 😕 찜찜함 · 😔 시무룩 · 🙂 평온.

## 명령

- `/mood` — 자세히 보기 (줄이 숨겨져 있으면 다시 켠다)
- `/mood hide` — 입력창 위 줄 숨기기
- `/mood reset` — 기분을 처음으로

기분은 세션마다 따로이고, 이 모드는 바깥으로 아무것도 보내지 않습니다.
