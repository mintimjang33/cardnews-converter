# 네이버 키워드 검색량 MCP 서버 — 설정 가이드

이 가이드를 따라하면, Claude가 블로그 글감을 정할 때마다 직접 네이버 검색량을 조회해서
검색 수요가 높은 키워드 각도를 자동으로 선택할 수 있게 됩니다.

전체 흐름은 이렇습니다.

```
[1] 네이버 검색광고 API 키 발급 (5분)
        ↓
[2] 받은 코드(keyword.js)를 기존 cardnews-converter 프로젝트에 추가
        ↓
[3] 깃허브에 푸시 → Vercel이 자동 배포 (이미 쓰고 계신 흐름 그대로)
        ↓
[4] Vercel 환경변수에 API 키 3개 등록
        ↓
[5] claude.ai 설정에서 커넥터로 등록
        ↓
완료 — 이후로는 "오늘 블로그 글 써줘"만 하면 Claude가 알아서 검색량 확인 후 글감 결정
```

---

## 1단계 — 네이버 검색광고 API 키 발급

1. https://searchad.naver.com 접속 → 네이버 아이디로 로그인 (사업자 등록 없이 개인도 가능)
2. 처음이면 광고주 계정 생성 (무료, 광고를 실제로 집행할 필요 없음)
3. 우측 상단 톱니바퀴(도구) → **API 사용 관리** 클릭
4. **API 신청** 클릭 → 약관 동의
5. 발급된 값 3개를 메모장에 복사해두기:
   - **CUSTOMER ID** (계정 화면 상단에 표시되는 숫자)
   - **ACCESS LICENSE** (API 키)
   - **SECRET KEY** (비밀키 — 한 번만 보여주니 꼭 복사)

> ⚠️ SECRET KEY는 재발급하지 않는 한 다시 볼 수 없어요. 못 받았으면 키를 삭제하고 새로 발급받으면 됩니다.

---

## 2단계 — 프로젝트에 코드 추가

같이 드린 `pages/api/mcp/keyword.js` 파일을, 기존 `cardnews-converter` 프로젝트의
같은 경로(`pages/api/mcp/keyword.js`)에 그대로 넣으시면 됩니다.

로컬에 프로젝트 폴더가 있다면:

```bash
# 프로젝트 폴더로 이동
cd cardnews-converter-main

# mcp 폴더 생성 후 파일 복사 (받으신 keyword.js를 여기로 옮기기)
mkdir -p pages/api/mcp
cp ~/Downloads/keyword.js pages/api/mcp/keyword.js
```

코드 자체를 수정할 필요는 없습니다. 키는 코드에 직접 넣지 않고 4단계에서
Vercel 환경변수로 등록합니다 (깃허브에 비밀키가 노출되지 않도록 하기 위함).

---

## 3단계 — 깃허브 푸시 → Vercel 자동 배포

지금 쓰고 계신 배포 흐름과 동일합니다.

```bash
git add pages/api/mcp/keyword.js
git commit -m "feat: 네이버 키워드 검색량 MCP 서버 추가"
git push
```

푸시하면 Vercel이 자동으로 감지해서 새 버전을 배포합니다.
(Vercel 대시보드 → 프로젝트 → Deployments 탭에서 진행 상황 확인 가능)

---

## 4단계 — Vercel에 환경변수 등록

1. https://vercel.com 대시보드 접속 → `cardnews-converter` 프로젝트 클릭
2. **Settings → Environment Variables** 탭
3. 아래 3개를 각각 추가 (Production / Preview / Development 전부 체크):

| Key | Value |
|---|---|
| `NAVER_AD_API_KEY` | 1단계에서 받은 ACCESS LICENSE |
| `NAVER_AD_SECRET_KEY` | 1단계에서 받은 SECRET KEY |
| `NAVER_AD_CUSTOMER_ID` | 1단계에서 받은 CUSTOMER ID |

4. 저장 후 **Deployments** 탭에서 가장 최근 배포 옆 `···` → **Redeploy** 클릭
   (환경변수는 재배포해야 적용됩니다)

---

## 5단계 — 동작 확인

배포가 끝나면 브라우저에서 직접 열어 확인할 수 있습니다.

```
https://cardnews-converter.vercel.app/api/mcp/keyword?hintKeywords=온라인타이머
```

아래와 비슷한 JSON이 뜨면 성공입니다.

```json
{
  "query": ["온라인타이머"],
  "results": [
    {
      "keyword": "온라인타이머",
      "monthlySearchPc": 1200,
      "monthlySearchMobile": 3400,
      "monthlySearchTotal": 4600,
      "competition": "중간",
      "monthlyAvgClickPc": 15,
      "monthlyAvgClickMobile": 80,
      "monthlyAvgAdCount": 8
    }
  ]
}
```

에러가 뜬다면:
- `환경변수가 설정되지 않았습니다` → 4단계를 다시 확인하고 재배포했는지 확인
- `Invalid Signature` (401) → CUSTOMER ID / API KEY / SECRET KEY 중 하나가 잘못 복사됨

---

## 6단계 — claude.ai에 커넥터로 등록

1. claude.ai 접속 → **설정(Settings) → 커넥터(Connectors)**
2. **커넥터 추가** → URL 직접 입력
3. 아래 주소를 등록:
   ```
   https://cardnews-converter.vercel.app/api/mcp/keyword
   ```
4. 저장

> 참고: claude.ai 커넥터 화면 구성은 종종 바뀝니다. 등록 단계가 위와 다르게 보이면
> 화면 캡처를 보내주시면 그 화면 기준으로 다시 안내해드릴게요.

---

## 다 끝나면

이후로는 "오늘 블로그 글 써줘"라고만 하시면 Claude가:
1. 다음 차례 도구를 정하고
2. 그 도구 관련 후보 키워드 3~5개를 이 MCP로 직접 조회해서
3. 검색량이 가장 높은 각도를 자동으로 선택해 글을 씁니다

사용자님이 직접 키워드도구에 들어가서 찾아볼 필요가 없어집니다.
