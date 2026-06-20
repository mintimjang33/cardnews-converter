# 네이버 키워드 검색량 MCP 서버 — 설정 가이드 (v2, 진짜 MCP 프로토콜 버전)

## ⚠️ 이전 버전에서 무엇이 바뀌었나

이전에 드린 `pages/api/mcp/keyword.js`는 **일반 REST API**였습니다.
브라우저로 직접 열면 잘 작동했지만, claude.ai 커넥터는 일반 REST API가 아니라
**MCP(Model Context Protocol)라는 정해진 통신 규격**을 따르는 서버만 인식합니다.
그래서 "연결 문제 — URL이 유효한 MCP 서버를 가리키는지 확인하세요" 오류가 떴던 것입니다.

이번 버전은 Vercel 공식 패키지 `mcp-handler`로 **진짜 MCP 프로토콜(Streamable HTTP)**을
구현했습니다. 이전 단계에서 등록하신 환경변수 3개(`NAVER_AD_API_KEY` 등)는
**그대로 재사용**되니 다시 입력하실 필요 없습니다.

---

## 1단계 — 패키지 설치

프로젝트 폴더(`cardnews-converter-main`)에서 터미널을 열고 아래 명령 실행:

```bash
npm install mcp-handler @modelcontextprotocol/sdk@^1.26.0 zod@^3
```

설치가 끝나면 `package.json`의 `dependencies`에 아래 3줄이 추가된 걸 확인하세요:

```json
"mcp-handler": "...",
"@modelcontextprotocol/sdk": "^1.26.0",
"zod": "^3..."
```

> 로컬에 Node.js가 없어서 `npm install`을 직접 못 돌리신다면, 깃허브 웹 화면에서
> `package.json`을 열어 `dependencies` 블록에 아래 3줄을 직접 추가하셔도 됩니다
> (정확한 버전 번호가 걱정되면 일단 아래처럼 넣고 푸시 — Vercel 빌드 시 npm이 알아서
> 호환 버전을 받아옵니다):
> ```json
> "mcp-handler": "^1.0.0",
> "@modelcontextprotocol/sdk": "^1.26.0",
> "zod": "^3.23.0"
> ```

---

## 2단계 — 새 코드 추가

같이 드린 `app/api/mcp/route.js` 파일을, 프로젝트의 같은 경로(`app/api/mcp/route.js`)에
그대로 추가하세요.

기존 프로젝트는 `pages/` 폴더(Pages Router)만 쓰고 있었는데, `app/` 폴더(App Router)를
**새로 만들어서 추가**하는 것뿐입니다. Next.js는 두 방식을 한 프로젝트에서 같이 쓸 수
있어서, 기존 `pages/` 안의 다른 코드는 전혀 건드리지 않습니다.

```
cardnews-converter-main/
├── pages/              ← 기존 그대로, 손 안 댐
│   ├── api/
│   │   └── mcp/
│   │       └── keyword.js   ← 이제 안 쓰지만 지워도 되고 둬도 무방
│   └── ...
└── app/                ← 새로 추가
    └── api/
        └── mcp/
            └── route.js     ← 새로 추가한 진짜 MCP 서버
```

(이전 `pages/api/mcp/keyword.js`는 그대로 둬도 충돌 없습니다. 정리하고 싶으시면
지우셔도 되지만, 지금 단계에서는 필수가 아닙니다.)

---

## 3단계 — 깃허브 푸시 → Vercel 자동 배포

```bash
git add package.json app/api/mcp/route.js
git commit -m "feat: 진짜 MCP 프로토콜로 네이버 키워드 서버 재구현"
git push
```

Vercel 대시보드 → Deployments 탭에서 빌드가 끝날 때까지 기다립니다 (1~2분).

> 빌드가 실패하면 보통 `package.json`의 버전 표기 오류입니다. 에러 로그를
> 캡처해서 보내주시면 바로 봐드릴게요.

---

## 4단계 — claude.ai에 다시 등록

1. claude.ai → 설정 → 커넥터
2. 기존에 추가했던 "네이버 키워드" 커넥터가 있다면 삭제(또는 URL 수정)
3. 새로 추가 → URL:
   ```
   https://cardnews-converter.vercel.app/api/mcp
   ```
   (이전엔 `/api/mcp/keyword`였는데, 이번엔 끝에 `/keyword`가 없습니다 — 주소가 바뀌었습니다)
4. 연결 시도 → 이번엔 "연결됨" 또는 도구 목록(`naver_keyword_volume`)이 보이면 성공입니다.

---

## 문제가 생기면

- **"연결 문제"가 또 뜬다** → Vercel 배포가 성공했는지, 빌드 로그에 에러가 없는지 먼저 확인
- **빌드 자체가 실패한다** → 빌드 로그 캡처해서 보내주세요
- **연결은 되는데 도구 호출 시 에러** → 환경변수 3개가 여전히 등록돼 있는지 확인 (이전 단계에서 등록한 것 그대로 유지하면 됩니다)
