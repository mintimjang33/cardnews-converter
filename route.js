// app/.well-known/oauth-authorization-server/route.js
//
// 이 MCP 서버는 OAuth 인증을 사용하지 않습니다 (Vercel 환경변수로 네이버 API 키를 처리).
// claude.ai 등 MCP 클라이언트가 연결 시 자동으로 이 경로를 조회해 OAuth 지원 여부를
// 확인하는데, 별도 라우트가 없으면 Next.js 기본 404(HTML)가 내려가면서 클라이언트가
// "로그인 서비스에 등록할 수 없습니다" 같은 에러를 띄우는 경우가 있습니다.
// 명시적으로 404 JSON을 반환해 "OAuth 메타데이터 없음(=인증 불필요)"임을 분명히 합니다.

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'not_found', error_description: 'This server does not use OAuth.' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  )
}
