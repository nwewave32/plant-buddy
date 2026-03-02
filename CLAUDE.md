# Plant Buddy — 개발 컨벤션

## FSD 레이어 네이밍

PRD에서 `src/pages/`로 정의된 FSD 페이지 레이어는 **`src/views/`**로 변경되었다.

Next.js가 `src/pages/` 디렉토리를 Pages Router로 인식하여 App Router와 충돌하기 때문이다.

| PRD 원본 | 실제 프로젝트 | 경로 별칭 |
|----------|-------------|----------|
| `src/pages/` | `src/views/` | `@/views/*` |

PRD에서 `src/pages/` 또는 `@/pages/`를 언급하는 부분은 모두 `src/views/` / `@/views/`로 읽어야 한다.
