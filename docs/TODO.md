# Plant Buddy - Development TODO

> PRD v1.1 기반 개발 체크리스트
> 마지막 업데이트: 2026-03-02

---

## Phase 1: MVP (4주)

### 1주차 — 프로젝트 셋업, DB, Auth

#### 프로젝트 초기 세팅
- [x] Next.js 16 + TypeScript + Tailwind CSS v4 프로젝트 생성
- [x] FSD 디렉토리 구조 생성 (app, views, widgets, features, entities, shared)
- [x] TypeScript 경로 별칭 설정 (`@/app`, `@/views`, `@/widgets` 등)
- [x] ESLint FSD import 규칙 설정
- [x] shadcn/ui 초기화 및 기본 컴포넌트 설치 (button, card, dialog, input, badge, tabs)
- [x] 환경변수 템플릿 생성 (`.env.example`)
- [x] Git 초기화

#### 데이터베이스
- [x] DB 스키마 마이그레이션 SQL 작성 (7개 테이블 + 인덱스 + RLS)
- [x] Supabase 프로젝트 생성 및 연결
- [x] 마이그레이션 실행 및 검증
- [ ] Supabase Storage 버킷 생성 (식물 사진용)

#### 인증 (Auth)
- [x] Supabase Auth Magic Link 설정
- [x] `features/auth` — LoginForm UI 구현
- [x] `entities/user` — types, useCurrentUser 훅 구현
- [x] 인증 미들웨어 (middleware.ts) — 미인증 사용자 리다이렉트
- [x] 로그인/로그아웃 플로우 E2E 동작 확인

### 2주차 — 엔티티, 식물 CRUD, 프리셋

#### 엔티티 레이어
- [x] `entities/plant` — PlantCard, PlantPhoto, StatusBadge UI 구현
- [x] `entities/plant` — types.ts, usePlant 훅, plantApi 구현
- [x] `entities/season` — SeasonBadge, SeasonSummary UI 구현
- [x] `entities/season` — types.ts, seasonHelpers 구현
- [x] `entities/watering-log` — LogEntry UI, types 구현
- [x] `entities/user` — UserAvatar UI 구현
- [x] `entities/delegation` — DelegationCard UI, types 구현
- [x] 모든 엔티티 `index.ts` public API export 정리

#### 식물 관리 (CRUD)
- [x] `features/manage-plant` — PlantForm UI 구현
- [x] `features/manage-plant` — usePlantForm 훅 (Zod 검증 포함)
- [x] `features/manage-plant` — managePlant API 함수 (생성/수정/삭제)
- [x] `GET /api/plants` — 식물 목록 API 구현 (`?mine=true` 필터)
- [x] `GET /api/plants/[id]` — 식물 상세 API 구현 (logs, presets 포함)
- [x] `POST /api/plants` — 식물 등록 API 구현 (admin 권한)
- [x] `PATCH /api/plants/[id]` — 식물 수정 API 구현
- [x] `DELETE /api/plants/[id]` — 식물 삭제 API 구현 (admin 권한)
- [x] 이미지 업로드 (Supabase Storage 연동)

#### 계절 프리셋
- [x] `features/manage-seasonal-presets` — useSeasonalPresets 훅
- [x] `features/manage-seasonal-presets` — presets API 함수
- [x] `widgets/seasonal-preset-editor` — SeasonalPresetEditor UI (탭 기반 4계절 편집)
- [x] `widgets/seasonal-preset-editor` — usePresetForm 훅
- [x] `GET /api/plants/[id]/presets` — 4계절 프리셋 조회 API
- [x] `PUT /api/plants/[id]/presets` — 프리셋 일괄 upsert API (enabled/disabled 처리)

#### 페이지 구성
- [x] `views/plant-detail` — PlantDetailPage 컴포지션
- [x] `views/plant-form` — PlantFormPage 컴포지션 (등록/수정 공용)
- [x] `app/(main)/plants` — 식물 목록 페이지 완성
- [x] `app/(main)/plants/[id]` — 식물 상세 페이지 연결
- [x] `app/(main)/plants/[id]/edit` — 식물 수정 페이지 연결
- [x] `app/(main)/plants/new` — 식물 등록 페이지 연결

### 3주차 — 물주기, 대시보드, 알림, 계절 전환

#### 물주기 완료
- [x] `features/complete-watering` — WateringButton UI (메모 입력 포함)
- [x] `features/complete-watering` — useCompleteWatering 훅
- [x] `features/complete-watering` — completeWatering API 함수
- [x] `POST /api/plants/[id]/water` — 물주기 완료 API 구현
  - [x] 담당자/위임 대리자 권한 확인
  - [x] watering_logs 삽입 (season 포함)
  - [x] next_watering_date 재계산
- [x] `GET /api/plants/[id]/watering-logs` — 물주기 이력 API 구현

#### 대시보드
- [x] `widgets/today-tasks` — TodayTasks UI + useDashboard 훅
- [x] `widgets/my-plants-overview` — MyPlantsOverview UI
- [x] `views/home` — HomePage 컴포지션 (TodayTasks + MyPlantsOverview)
- [ ] `GET /api/dashboard` — 개인 대시보드 API 구현 (클라이언트 직접 쿼리로 대체, 501 스텁 유지)
- [x] `app/(main)/page.tsx` — 홈 페이지 연결
- [x] 현재 계절 모드 표시 (SeasonBadge)
- [x] 오늘의 할 일 + 다음 예정 식물 표시
- [x] 연체(지남) 식물 강조 표시

#### 푸시 알림 (web-push → FCM 단일 전환)
> 초기 web-push(VAPID)로 구현했으나, PWA 알림 UX 한계로 **Capacitor 네이티브 + FCM**으로 전환. web-push는 완전 제거.
- [x] ~~VAPID 키 생성 및 환경변수 설정~~ → FIREBASE_SERVICE_ACCOUNT로 대체
- [x] `features/subscribe-push` — PushToggle UI (네이티브 토글 / 브라우저는 앱 설치 안내)
- [x] `features/subscribe-push` — usePushSubscription 훅 (Capacitor FCM 기반)
- [x] `POST /api/push/subscribe` — FCM 토큰 구독 등록 API
- [x] `DELETE /api/push/subscribe` — FCM 토큰 구독 해제 API
- [x] `POST /api/cron/send-reminders` — 물주기 알림 발송 CRON (FCM)
  - [x] 당일 아침 예정 알림
  - [x] 당일 오후 미완료 리마인더 (로직 구현, Vercel Hobby 제약으로 자동 실행은 오전 1회)
  - [x] 예정일+1 연체 알림
- [x] 무효 FCM 토큰 자동 정리

#### 하이브리드 앱 (Capacitor + FCM)
> 웹앱을 네이티브 셸로 감싸 앱스토어 배포 + 네이티브 푸시 UX 확보. WebView는 Vercel 배포 URL 로드(서버 모드).
- [x] Capacitor 설치 + capacitor.config.ts (server.url, appId=app.plantbuddy)
- [x] DB 마이그레이션 00007 — push_subscriptions FCM 스키마 전환
- [x] firebase-admin 발송 헬퍼 (src/shared/lib/firebaseAdmin.ts)
- [x] 네이티브 푸시 구독/해제 + 알림 탭 → 식물 페이지 네비게이트
- [ ] Firebase 프로젝트 생성 + 서비스 계정 키 (Vercel env)
- [ ] iOS APNs 인증키(.p8) 생성 + Firebase 업로드
- [ ] `npx cap add ios/android` + 네이티브 설정파일 배치
- [ ] Xcode: Push Notifications / Background Modes capability
- [ ] 온디바이스 테스트 (로그인 → 알림 토글 → 수신)
- [ ] WebView 내 Supabase 세션/로그인 콜백 검증
- [ ] 앱스토어/플레이스토어 빌드 및 제출

#### 계절 전환 CRON
- [ ] `POST /api/cron/season-transition` — 계절 전환 로직 구현
  - [ ] 전환일 감지 (isSeasonTransitionDate)
  - [ ] seasonal_presets → plants 테이블 값 복사
  - [ ] next_watering_date 재계산 (마지막 물준 날 기준)
  - [ ] 담당자 계절 전환 알림 발송
- [ ] 프리셋 폴백 전략 (프리셋 없으면 기존값 유지)

### 4주차 — PWA, 네비게이션, 테스트, 배포

#### PWA
- [x] manifest.json 생성
- [x] Service Worker (sw.js) 생성
- [ ] PWA 설치 프롬프트 UI
- [ ] 오프라인 기본 페이지 (fallback)
- [ ] 앱 아이콘 제작 (icon-192.png, icon-512.png, badge-72.png)

#### 네비게이션
- [x] `widgets/navigation` — BottomNav UI (홈, 식물, 캘린더)
- [x] `widgets/navigation` — Header UI (설정, 프로필)
- [x] `app/(main)/layout.tsx` — BottomNav, Header 통합

#### 설정
- [x] `views/settings` — SettingsPage 구현
- [ ] 알림 수신 시각 변경
- [x] 푸시 알림 on/off 토글
- [x] 로그아웃

#### 테스트
- [ ] shared/lib 유닛 테스트 (season, date, validation)
- [x] API Route Handler 통합 테스트 (push/subscribe, cron/send-reminders 추가)
- [ ] 주요 플로우 E2E 테스트 (로그인 → 대시보드 → 물주기 완료)

#### 배포
- [x] vercel.json CRON 설정 (Hobby 제약으로 send-reminders 1일 1회로 조정)
- [x] Vercel 프로젝트 생성 및 환경변수 설정
- [x] Production 첫 배포
- [ ] CRON 동작 확인
- [ ] 초기 식물 데이터 입력 (시드)

---

## Phase 2: 확장 (2주)

### 5주차 — 상태 추적, 물주기 타임라인, 위임

#### 식물 상태 변경
- [ ] `features/change-plant-status` — StatusChanger UI
- [ ] `features/change-plant-status` — changeStatus API 함수
- [ ] `POST /api/plants/[id]/status` — 상태 변경 API 구현 (status_logs 기록)
- [ ] 위험 상태 시 admin 알림 발송

#### 물주기 타임라인
- [ ] `widgets/watering-timeline` — WateringTimeline UI (이력 시각화)
- [ ] `widgets/plant-info-panel` — PlantInfoPanel UI (관리 정보 + 계절 프리셋 표시)

#### 위임 (Delegation)
- [ ] `features/delegate-plant` — DelegationForm UI (위임 요청)
- [ ] `features/delegate-plant` — DelegationResponse UI (수락/거절)
- [ ] `features/delegate-plant` — delegation API 함수
- [ ] `POST /api/delegations` — 위임 요청 API
- [ ] `PATCH /api/delegations/[id]` — 수락/거절 API
- [ ] `GET /api/delegations` — 내 위임 목록 API
- [ ] 위임 요청/응답 푸시 알림
- [ ] 물주기 완료 시 위임 대리자 권한 확인 로직

### 6주차 — 관리자 대시보드, 이메일 알림

#### 관리자 대시보드
- [ ] `widgets/admin-stats` — AdminStats UI (전체 식물 현황, 연체율 등)
- [ ] `views/admin` — AdminPage 컴포지션
- [ ] `GET /api/admin/dashboard` — 관리자 대시보드 API 구현
- [ ] `app/(main)/admin` — 관리자 페이지 연결 (admin 권한 체크)

#### 이메일 알림 (iOS 대응)
- [ ] Resend API 연동
- [ ] 사용자별 알림 채널 설정 (`push` | `email` | `both`)
- [ ] 이메일 템플릿 작성 (물주기 알림, 계절 전환, 위임)
- [ ] send-reminders CRON에 이메일 채널 추가

---

## Phase 3: 고도화 (2주)

### 7주차 — 캘린더 뷰

- [ ] `widgets/watering-calendar` — WateringCalendar UI (월간 달력)
- [ ] `views/calendar` — CalendarPage 컴포지션
- [ ] `app/(main)/calendar` — 캘린더 페이지 연결
- [ ] 날짜별 물주기 예정/완료 표시
- [ ] 캘린더에서 식물 상세로 이동

### 8주차 — 오프라인 강화, UX 개선

- [ ] Service Worker 캐싱 전략 (네트워크 우선 + 캐시 폴백)
- [ ] 오프라인 상태 인디케이터
- [ ] 오프라인 물주기 완료 → 온라인 복귀 시 동기화
- [ ] 식물 사진 갤러리 (성장 기록)
- [ ] CSV 임포트 (초기 데이터 일괄 입력)
- [ ] 같은 종 프리셋 복사 기능
- [ ] 사용자 피드백 반영 및 UX 개선

---

## 공개 배포 (향후 과제)

> 사내 한정에서 **일반 사용자 대상 앱스토어 공개 배포**로 확장 시 필요한 항목. 현재 범위 아님, 추후 진행.

#### 법적/필수
- [ ] 개인정보처리방침 페이지 (스토어 제출 필수)
- [ ] 이용약관 페이지
- [ ] 계정 삭제 기능 (Apple App Store 필수 — 계정 생성 앱은 삭제 경로 제공 의무)

#### 스토어 등록
- [ ] 앱 아이콘 / 스플래시 / 스크린샷 / 스토어 설명
- [ ] 데이터 안전 양식 (Google Play) / 개인정보 라벨 (Apple)
- [ ] 연령 등급 설정

#### 제품 확장
- [ ] 사내 가정 제거 — 온보딩/회원가입 흐름, 일반 사용자용 카피 검토
- [ ] 사용자 분리 / 멀티 테넌시 검토 (조직 단위 데이터 격리)

---

## 범례

- [x] 완료
- [ ] 미완료
