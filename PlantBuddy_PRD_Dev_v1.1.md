# 🌱 Plant Buddy — 사내 식물 관리 서비스

> **Product Requirements Document (PRD) — Developer Specification**
> Version 1.1 · 2026-02-23 · Status: Draft
>
> **v1.1 변경사항:** 계절별 물주기 프리셋 시스템 추가, 프론트엔드 FSD 아키텍처 적용

---

## 1. 프로젝트 개요

### 1.1 배경

회사에 약 15그루의 식물이 있으며, 여러 명의 직원이 각자 몇 그루씩 담당하여 관리하고 있다. 식물마다 물 주는 주기, 양, 방법이 모두 다르기 때문에 담당자가 이를 모두 기억하기 어렵다. 기존에 문서로 정리되어 있지만 매번 꺼내보기 번거로워 물주기 타이밍을 놓치는 경우가 빈번하다.

**추가 문제:** 같은 식물이라도 계절에 따라 물주기 간격과 양이 달라진다. 여름에는 더 자주, 겨울에는 더 드물게 줘야 하는데 이를 담당자가 매번 판단하기 어렵다.

### 1.2 목표

- 담당자가 자신의 식물 관리 정보를 한눈에 확인할 수 있는 대시보드 제공
- 물주기 타이밍에 맞춰 푸시 알림 발송
- 물주기 완료 처리 및 이력 자동 추적
- 부재 시 대리 담당자 인수인계 지원
- **계절 변화에 따른 물주기 간격/양 자동 전환**

### 1.3 타겟 사용자

사내 식물 관리 담당자 4~6명. 식물 전문가가 아닌 일반 직원이며, 모바일 환경에서 주로 사용한다.

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | **Next.js 14+ (App Router)** | RSC, PWA, **FSD 아키텍처** |
| Styling | **Tailwind CSS + shadcn/ui** | 일관된 디자인 시스템 |
| Backend | **Next.js Route Handlers** | `/app/api/*` 경로 |
| Database | **Supabase (PostgreSQL)** | Row Level Security, Realtime 구독 |
| Auth | **Supabase Auth (Magic Link)** | 이메일 기반 비밀번호 없는 인증 |
| Push | **Web Push API + web-push (npm)** | VAPID 키 기반 |
| Scheduler | **Vercel Cron / Supabase pg_cron** | 알림 트리거 + **계절 전환 트리거** |
| Deploy | **Vercel** | Preview deploy, 자동 CI/CD |
| Image Storage | **Supabase Storage** | 식물 사진 업로드 |

### 2.1 주요 의존성

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.1.0",
    "web-push": "^3.6.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest"
  }
}
```

---

## 3. 데이터베이스 스키마

### 3.1 ERD 개요

```
users ──< plants ──< watering_logs
  │          │──< status_logs
  │          │──< delegations
  │          └──< seasonal_presets    ← NEW
  └──< push_subscriptions
```

### 3.2 테이블 정의

#### `users`

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Supabase Auth uid와 동일 |
| `email` | `text` | UNIQUE, NOT NULL | 로그인 이메일 |
| `name` | `text` | NOT NULL | 표시 이름 |
| `role` | `text` | NOT NULL, default `'member'` | `'member'` \| `'admin'` |
| `notification_time` | `time` | default `'09:00'` | 알림 수신 희망 시각 |
| `created_at` | `timestamptz` | default `now()` | |

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  notification_time time DEFAULT '09:00',
  created_at timestamptz DEFAULT now()
);
```

#### `plants`

plants 테이블의 `watering_interval_days`, `water_amount_ml` 등은 **현재 활성 계절 프리셋의 스냅샷**이다. CRON이 계절 전환 시 `seasonal_presets`에서 값을 복사하여 업데이트한다.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | `uuid` | PK | |
| `name` | `text` | NOT NULL | 식물 이름 (예: "회의실 몬스테라") |
| `species` | `text` | | 식물 종 (예: "몬스테라 델리시오사") |
| `photo_url` | `text` | | Supabase Storage URL |
| `location` | `text` | | 위치 설명 (예: "3층 회의실 창가") |
| `assigned_user_id` | `uuid` | FK → users.id | 담당자 |
| `watering_interval_days` | `integer` | NOT NULL, default `7` | **현재 적용 중인** 물주기 간격 |
| `water_amount_ml` | `integer` | | **현재 적용 중인** 물의 양 (ml) |
| `watering_method` | `text` | | `'top'` \| `'bottom'` \| `'mist'` \| `'other'` |
| `sunlight` | `text` | | `'direct'` \| `'indirect'` \| `'shade'` |
| `care_notes` | `text` | | 자유 형식 관리 메모 |
| `status` | `text` | default `'healthy'` | `'healthy'` \| `'caution'` \| `'danger'` |
| `current_season` | `text` | NOT NULL, default `'spring'` | **현재 적용 중인 계절** |
| `next_watering_date` | `date` | NOT NULL | 다음 물주기 예정일 |
| `created_at` | `timestamptz` | default `now()` | |

```sql
CREATE TABLE plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  species text,
  photo_url text,
  location text,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  watering_interval_days integer NOT NULL DEFAULT 7,
  water_amount_ml integer,
  watering_method text CHECK (watering_method IN ('top', 'bottom', 'mist', 'other')),
  sunlight text CHECK (sunlight IN ('direct', 'indirect', 'shade')),
  care_notes text,
  status text NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'caution', 'danger')),
  current_season text NOT NULL DEFAULT 'spring'
    CHECK (current_season IN ('spring', 'summer', 'autumn', 'winter')),
  next_watering_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plants_assigned_user ON plants(assigned_user_id);
CREATE INDEX idx_plants_next_watering ON plants(next_watering_date);
```

#### `seasonal_presets` ← NEW

식물별 계절(봄/여름/가을/겨울)마다 다른 물주기 설정을 저장. 하나의 식물에 최대 4개 프리셋.

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | `uuid` | PK | |
| `plant_id` | `uuid` | FK → plants.id, NOT NULL | |
| `season` | `text` | NOT NULL | `'spring'` \| `'summer'` \| `'autumn'` \| `'winter'` |
| `watering_interval_days` | `integer` | NOT NULL | 해당 계절 물주기 간격 |
| `water_amount_ml` | `integer` | | 해당 계절 물의 양 |
| `watering_method` | `text` | | 계절별 방법 오버라이드 |
| `care_notes` | `text` | | 계절별 추가 관리 메모 |

```sql
CREATE TABLE seasonal_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  season text NOT NULL CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  watering_interval_days integer NOT NULL,
  water_amount_ml integer,
  watering_method text CHECK (watering_method IN ('top', 'bottom', 'mist', 'other')),
  care_notes text,
  UNIQUE(plant_id, season)
);

CREATE INDEX idx_seasonal_presets_plant ON seasonal_presets(plant_id);
```

**예시 데이터 — 몬스테라:**

| season | interval | amount | method | notes |
|--------|----------|--------|--------|-------|
| spring | 7일 | 200ml | top | 새순 나오는 시기, 비료 2주 1회 |
| summer | 5일 | 250ml | top | 과습 주의, 통풍 확보 |
| autumn | 7일 | 200ml | top | 비료 중단 |
| winter | 12일 | 150ml | top | 흙 완전히 마른 후 급수 |

#### `watering_logs`

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| `id` | `uuid` | PK | |
| `plant_id` | `uuid` | FK → plants.id, NOT NULL | |
| `user_id` | `uuid` | FK → users.id, NOT NULL | 실제 물을 준 사람 |
| `watered_at` | `timestamptz` | default `now()` | 물준 시각 |
| `scheduled_date` | `date` | NOT NULL | 원래 예정일 |
| `was_late` | `boolean` | default `false` | 예정일 초과 여부 |
| `season` | `text` | | 물줄 당시 적용된 계절 |
| `memo` | `text` | | 특이사항 메모 |

```sql
CREATE TABLE watering_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  watered_at timestamptz DEFAULT now(),
  scheduled_date date NOT NULL,
  was_late boolean DEFAULT false,
  season text CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  memo text
);

CREATE INDEX idx_watering_logs_plant ON watering_logs(plant_id, watered_at DESC);
```

#### `status_logs`

```sql
CREATE TABLE status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('healthy', 'caution', 'danger')),
  memo text,
  changed_at timestamptz DEFAULT now()
);
```

#### `delegations`

```sql
CREATE TABLE delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  accepted boolean,
  created_at timestamptz DEFAULT now(),
  CHECK (start_date <= end_date),
  CHECK (from_user_id != to_user_id)
);
```

#### `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

### 3.3 Row Level Security (RLS)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plants_select_all" ON plants FOR SELECT USING (true);
CREATE POLICY "plants_insert_admin" ON plants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "plants_update_admin_or_assigned" ON plants FOR UPDATE
  USING (
    assigned_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

ALTER TABLE seasonal_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_select_all" ON seasonal_presets FOR SELECT USING (true);
CREATE POLICY "presets_modify_admin" ON seasonal_presets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE watering_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_insert_own" ON watering_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "logs_select" ON watering_logs FOR SELECT USING (true);
```

---

## 4. 계절별 물주기 시스템 설계

### 4.1 계절 정의

한국 기준 기상청 계절 구분을 따르되, 실내 환경(냉난방)을 고려하여 조정했다.

| 계절 | 기간 | 전환 트리거 날짜 | 특징 |
|------|------|-----------------|------|
| `spring` | 3월~5월 | **3월 1일** | 성장 시작, 물 흡수량 증가 |
| `summer` | 6월~8월 | **6월 1일** | 성장 최성기, 가장 빈번한 급수 |
| `autumn` | 9월~11월 | **9월 1일** | 성장 둔화, 급수량 감소 |
| `winter` | 12월~2월 | **12월 1일** | 휴면기, 최소 급수 |

> **설정 가능:** 관리자가 전환 날짜를 환경변수(`SEASON_SPRING_START` 등)로 조정 가능.

### 4.2 계절 전환 CRON 로직

```
POST /api/cron/season-transition
(매일 자정 실행, 전환일에만 실제 동작)
```

```typescript
// shared/lib/season.ts
type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const SEASON_BOUNDARIES: Record<Season, { month: number; day: number }> = {
  spring: { month: 3, day: 1 },
  summer: { month: 6, day: 1 },
  autumn: { month: 9, day: 1 },
  winter: { month: 12, day: 1 },
};

function getCurrentSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function isSeasonTransitionDate(date: Date = new Date()): boolean {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return Object.values(SEASON_BOUNDARIES).some(
    (b) => b.month === m && b.day === d
  );
}
```

```typescript
// /api/cron/season-transition 핸들러
async function handleSeasonTransition() {
  const today = new Date();
  if (!isSeasonTransitionDate(today)) return { transitioned: 0 };

  const newSeason = getCurrentSeason(today);

  // 1. 해당 계절 프리셋이 있는 식물 조회
  const { data: presets } = await supabase
    .from('seasonal_presets')
    .select('plant_id, watering_interval_days, water_amount_ml, watering_method, care_notes')
    .eq('season', newSeason);

  if (!presets?.length) return { transitioned: 0 };

  // 2. 식물별 plants 테이블 업데이트
  let count = 0;
  for (const preset of presets) {
    const { data: plant } = await supabase
      .from('plants')
      .select('next_watering_date, watering_interval_days')
      .eq('id', preset.plant_id)
      .single();

    // 마지막 물준 날 역산 후 새 간격으로 재계산
    const lastWateredDate = subDays(
      parseISO(plant.next_watering_date),
      plant.watering_interval_days
    );
    const newNextDate = addDays(lastWateredDate, preset.watering_interval_days);
    const effectiveNextDate = isBefore(newNextDate, today)
      ? addDays(today, 1)
      : newNextDate;

    await supabase.from('plants').update({
      watering_interval_days: preset.watering_interval_days,
      water_amount_ml: preset.water_amount_ml,
      watering_method: preset.watering_method,
      current_season: newSeason,
      next_watering_date: effectiveNextDate.toISOString(),
    }).eq('id', preset.plant_id);

    count++;
  }

  // 3. 담당자들에게 계절 전환 알림
  await notifySeasonChange(newSeason, presets);

  return { transitioned: count, season: newSeason };
}
```

### 4.3 프리셋 폴백 전략

모든 식물이 4계절 프리셋을 가질 필요는 없다.

```
1. 해당 계절의 프리셋이 있으면 → 그 프리셋 적용
2. 없으면 → 현재 plants 테이블의 값 유지 (변경 없음)
```

계절 차이가 크지 않은 식물은 프리셋 없이 단일 설정으로 운영 가능.

### 4.4 관리자 UI — 프리셋 편집

```
┌─────────────────────────────────────────┐
│  회의실 몬스테라 - 계절별 물주기 설정     │
├─────────────────────────────────────────┤
│                                         │
│  [🌸봄]  [☀️여름]  [🍂가을]  [❄️겨울]   │
│  ─────────────────────────────          │
│  현재 선택: ☀️ 여름                      │
│                                         │
│  💧 간격:  [ 5 ]일                      │
│  💦 양:    [ 250 ]ml                    │
│  🚿 방법:  [위에서 뿌리기 ▾]             │
│  📝 메모:  [ 과습 주의, 통풍 확보    ]    │
│                                         │
│  ☑ 이 계절 프리셋 사용                   │
│     (체크 해제 시 기본값 유지)            │
│                                         │
│  ── 전체 계절 요약 ──                    │
│  🌸 봄:   7일 / 200ml                   │
│  ☀️ 여름:  5일 / 250ml  ← 현재 적용 중   │
│  🍂 가을:  7일 / 200ml                   │
│  ❄️ 겨울: 12일 / 150ml                   │
│                                         │
│  [저장]                                  │
└─────────────────────────────────────────┘
```

### 4.5 담당자에게 보이는 정보

- 식물 상세: "현재 계절: ☀️ 여름 모드 (5일 간격, 250ml)" 표시
- 물주기 알림: 현재 계절 기준의 양과 방법 안내
- 계절 전환 시: "계절이 바뀌어 물주기 간격이 변경되었어요" 알림

### 4.6 계절 전환 시 next_watering_date 재계산

단순히 "오늘 + 새 간격"이면 방금 물 준 식물도 리셋되므로, 마지막 물준 날 기준으로 재계산:

```typescript
function recalcNextDate(
  lastWateredDate: Date,
  newInterval: number,
  today: Date
): Date {
  const ideal = addDays(lastWateredDate, newInterval);
  return isBefore(ideal, today) ? addDays(today, 1) : ideal;
}
```

**예시:** 마지막 물준 날 2/25, 겨울 간격 12일(예정 3/9) → 3/1 봄 전환, 새 간격 7일 → 2/25+7 = 3/4로 앞당겨짐.

---

## 5. API 설계

### 5.1 엔드포인트 목록

#### Plants

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/plants` | 식물 목록. `?mine=true`로 내 담당만 필터 | all |
| `GET` | `/api/plants/[id]` | 식물 상세 (logs, presets 포함) | all |
| `POST` | `/api/plants` | 식물 등록 (presets 함께 생성) | admin |
| `PATCH` | `/api/plants/[id]` | 식물 정보 수정 | admin, assigned |
| `DELETE` | `/api/plants/[id]` | 식물 삭제 | admin |

#### Seasonal Presets

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `GET` | `/api/plants/[id]/presets` | 4계절 프리셋 조회 | all |
| `PUT` | `/api/plants/[id]/presets` | 프리셋 일괄 upsert | admin |

#### Watering

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/plants/[id]/water` | 물주기 완료 | assigned, delegate |
| `GET` | `/api/plants/[id]/watering-logs` | 물주기 이력 | all |

#### Status / Delegations / Notifications / Dashboard

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| `POST` | `/api/plants/[id]/status` | 상태 변경 | assigned, admin |
| `POST` | `/api/delegations` | 위임 요청 | assigned |
| `PATCH` | `/api/delegations/[id]` | 수락/거절 | to_user |
| `GET` | `/api/delegations` | 내 위임 목록 | own |
| `POST` | `/api/push/subscribe` | 푸시 구독 등록 | all |
| `DELETE` | `/api/push/subscribe` | 푸시 구독 해제 | all |
| `POST` | `/api/cron/send-reminders` | 물주기 알림 발송 | cron secret |
| `POST` | `/api/cron/season-transition` | 계절 전환 처리 | cron secret |
| `GET` | `/api/dashboard` | 개인 대시보드 | all |
| `GET` | `/api/admin/dashboard` | 관리자 대시보드 | admin |

### 5.2 핵심 API 상세

#### `POST /api/plants/[id]/water`

**Request:** `{ memo?: string }`

**로직:**
1. 현재 유저가 담당자 또는 활성 위임 대리자인지 확인
2. `watering_logs` 삽입 (season = `plants.current_season`)
3. `plants.next_watering_date` = today + `watering_interval_days`
4. 업데이트된 plant 반환

**Response:** `{ plant: Plant, log: WateringLog, next_watering_date: string }`

#### `PUT /api/plants/[id]/presets`

**Request:**
```typescript
{
  presets: Array<{
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    enabled: boolean;
    watering_interval_days: number;
    water_amount_ml?: number;
    watering_method?: string;
    care_notes?: string;
  }>;
}
```

**로직:** enabled=true → UPSERT, enabled=false → DELETE. 현재 계절 프리셋 변경 시 plants 즉시 반영.

### 5.3 Vercel Cron 설정

```json
{
  "crons": [
    { "path": "/api/cron/send-reminders", "schedule": "0 0,6 * * *" },
    { "path": "/api/cron/season-transition", "schedule": "0 15 * * *" }
  ]
}
```

> `send-reminders`: UTC 0시/6시 = KST 09시/15시. `season-transition`: UTC 15시 = KST 자정.

---

## 6. 프론트엔드 구조 (FSD)

Feature-Sliced Design을 적용한다. `app/`은 라우팅만, 실제 로직/UI는 `src/` FSD 레이어에 배치.

### 6.1 FSD 레이어 개요

```
src/
├── app/          # Layer 1: 앱 초기화, 프로바이더, 글로벌 설정
├── pages/        # Layer 2: 페이지별 컴포지션 (Next.js app/ 에서 import)
├── widgets/      # Layer 3: 독립적인 UI 블록 (여러 feature 조합)
├── features/     # Layer 4: 사용자 인터랙션 단위 (비즈니스 액션)
├── entities/     # Layer 5: 비즈니스 엔티티 (데이터 모델 + 기본 UI)
└── shared/       # Layer 6: 공유 유틸리티, UI 키트, API 클라이언트
```

**핵심 규칙:**
- 상위 레이어만 하위를 import (`features/` → `entities/` ✅, `entities/` → `features/` ❌)
- 같은 레이어 내 슬라이스 간 직접 import 금지 (cross-import는 `shared/`를 통해)
- 각 슬라이스는 `index.ts`로 public API 노출

### 6.2 디렉토리 상세 구조

```
src/
├── app/                              # 앱 레이어
│   ├── providers/
│   │   ├── SupabaseProvider.tsx
│   │   ├── AuthProvider.tsx
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   └── index.ts
│
├── pages/                            # 페이지 컴포지션 레이어
│   ├── home/
│   │   ├── ui/HomePage.tsx           # 위젯 조합으로 페이지 구성
│   │   └── index.ts
│   ├── plant-detail/
│   │   ├── ui/PlantDetailPage.tsx
│   │   └── index.ts
│   ├── plant-form/
│   │   ├── ui/PlantFormPage.tsx
│   │   └── index.ts
│   ├── calendar/
│   │   ├── ui/CalendarPage.tsx
│   │   └── index.ts
│   ├── settings/
│   │   ├── ui/SettingsPage.tsx
│   │   └── index.ts
│   └── admin/
│       ├── ui/AdminPage.tsx
│       └── index.ts
│
├── widgets/                          # 위젯 레이어
│   ├── today-tasks/
│   │   ├── ui/TodayTasks.tsx         # 오늘의 할 일
│   │   ├── model/useTodayTasks.ts
│   │   └── index.ts
│   ├── my-plants-overview/
│   │   ├── ui/MyPlantsOverview.tsx
│   │   └── index.ts
│   ├── plant-info-panel/
│   │   ├── ui/PlantInfoPanel.tsx     # 관리 정보 + 계절 프리셋 표시
│   │   └── index.ts
│   ├── watering-timeline/
│   │   ├── ui/WateringTimeline.tsx
│   │   └── index.ts
│   ├── seasonal-preset-editor/
│   │   ├── ui/SeasonalPresetEditor.tsx
│   │   ├── model/usePresetForm.ts
│   │   └── index.ts
│   ├── admin-stats/
│   │   ├── ui/AdminStats.tsx
│   │   └── index.ts
│   ├── navigation/
│   │   ├── ui/BottomNav.tsx
│   │   ├── ui/Header.tsx
│   │   └── index.ts
│   └── watering-calendar/
│       ├── ui/WateringCalendar.tsx
│       └── index.ts
│
├── features/                         # 피처 레이어
│   ├── complete-watering/
│   │   ├── ui/WateringButton.tsx     # 물주기 완료 버튼 + 메모
│   │   ├── model/useCompleteWatering.ts
│   │   ├── api/completeWatering.ts
│   │   └── index.ts
│   ├── change-plant-status/
│   │   ├── ui/StatusChanger.tsx
│   │   ├── api/changeStatus.ts
│   │   └── index.ts
│   ├── delegate-plant/
│   │   ├── ui/DelegationForm.tsx
│   │   ├── ui/DelegationResponse.tsx
│   │   ├── api/delegation.ts
│   │   └── index.ts
│   ├── manage-plant/
│   │   ├── ui/PlantForm.tsx
│   │   ├── model/usePlantForm.ts
│   │   ├── api/managePlant.ts
│   │   └── index.ts
│   ├── manage-seasonal-presets/
│   │   ├── api/presets.ts
│   │   ├── model/useSeasonalPresets.ts
│   │   └── index.ts
│   ├── subscribe-push/
│   │   ├── ui/PushToggle.tsx
│   │   ├── model/usePushSubscription.ts
│   │   └── index.ts
│   └── auth/
│       ├── ui/LoginForm.tsx
│       ├── model/useAuth.ts
│       └── index.ts
│
├── entities/                         # 엔티티 레이어
│   ├── plant/
│   │   ├── ui/PlantCard.tsx
│   │   ├── ui/PlantPhoto.tsx
│   │   ├── ui/StatusBadge.tsx        # 🟢🟡🔴
│   │   ├── model/types.ts
│   │   ├── model/usePlant.ts
│   │   ├── api/plantApi.ts
│   │   └── index.ts
│   ├── watering-log/
│   │   ├── ui/LogEntry.tsx
│   │   ├── model/types.ts
│   │   └── index.ts
│   ├── user/
│   │   ├── ui/UserAvatar.tsx
│   │   ├── model/types.ts
│   │   ├── model/useCurrentUser.ts
│   │   └── index.ts
│   ├── delegation/
│   │   ├── ui/DelegationCard.tsx
│   │   ├── model/types.ts
│   │   └── index.ts
│   └── season/
│       ├── ui/SeasonBadge.tsx        # 🌸☀️🍂❄️
│       ├── ui/SeasonSummary.tsx      # 4계절 프리셋 요약
│       ├── model/types.ts
│       ├── model/seasonHelpers.ts    # getCurrentSeason 등
│       └── index.ts
│
└── shared/                           # 공유 레이어
    ├── api/
    │   ├── supabase/client.ts        # 브라우저용
    │   ├── supabase/server.ts        # 서버용
    │   └── fetch.ts
    ├── config/
    │   ├── env.ts
    │   └── seasons.ts               # 계절 경계 설정
    ├── lib/
    │   ├── date.ts
    │   ├── season.ts
    │   └── validation.ts
    ├── ui/                           # shadcn/ui 기반 공통 컴포넌트
    │   ├── button/
    │   ├── card/
    │   ├── dialog/
    │   ├── input/
    │   ├── badge/
    │   ├── tabs/
    │   └── calendar/
    └── types/index.ts
```

### 6.3 Next.js App Router ↔ FSD 연결

`app/`은 라우팅 전용 thin layer. 실제 컨텐츠는 `src/pages`에서 import.

```
app/
├── layout.tsx                         # → src/app/providers
├── (auth)/
│   ├── login/page.tsx                 # → @/features/auth
│   └── layout.tsx
├── (main)/
│   ├── layout.tsx                     # → @/widgets/navigation
│   ├── page.tsx                       # → @/pages/home
│   ├── plants/
│   │   ├── page.tsx                   # 식물 목록 (inline)
│   │   ├── [id]/page.tsx              # → @/pages/plant-detail
│   │   ├── [id]/edit/page.tsx         # → @/pages/plant-form
│   │   └── new/page.tsx               # → @/pages/plant-form
│   ├── calendar/page.tsx              # → @/pages/calendar
│   ├── settings/page.tsx              # → @/pages/settings
│   └── admin/page.tsx                 # → @/pages/admin
├── api/                               # Route Handlers
├── manifest.json
└── sw.js
```

**페이지 컴포지션 예시:**

```tsx
// src/pages/home/ui/HomePage.tsx
import { TodayTasks } from '@/widgets/today-tasks';
import { MyPlantsOverview } from '@/widgets/my-plants-overview';

export function HomePage() {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <TodayTasks />
      <MyPlantsOverview />
    </div>
  );
}
```

**위젯 컴포지션 예시:**

```tsx
// src/widgets/today-tasks/ui/TodayTasks.tsx
import { PlantCard } from '@/entities/plant';
import { WateringButton } from '@/features/complete-watering';
import { SeasonBadge } from '@/entities/season';
import { useTodayTasks } from '../model/useTodayTasks';

export function TodayTasks() {
  const { plants, isLoading } = useTodayTasks();

  return (
    <section>
      <h2>오늘의 할 일 ({plants.length}건)</h2>
      {plants.map((plant) => (
        <PlantCard key={plant.id} plant={plant}>
          <SeasonBadge season={plant.current_season} />
          <WateringButton plantId={plant.id} />
        </PlantCard>
      ))}
    </section>
  );
}
```

### 6.4 Import 별칭 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@/app/*": ["./src/app/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/widgets/*": ["./src/widgets/*"],
      "@/features/*": ["./src/features/*"],
      "@/entities/*": ["./src/entities/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  }
}
```

### 6.5 FSD Public API 규칙

```typescript
// src/entities/plant/index.ts — 외부 노출 API
export { PlantCard } from './ui/PlantCard';
export { PlantPhoto } from './ui/PlantPhoto';
export { StatusBadge } from './ui/StatusBadge';
export { usePlant } from './model/usePlant';
export type { Plant, SeasonalPreset } from './model/types';

// ❌ import { PlantCard } from '@/entities/plant/ui/PlantCard'
// ✅ import { PlantCard } from '@/entities/plant'
```

**ESLint:**
```json
{
  "rules": {
    "import/no-internal-modules": ["error", {
      "allow": ["@/shared/**"]
    }]
  }
}
```

---

## 7. 핵심 화면 명세

### 7.1 홈 대시보드 (`/`)

```
┌─────────────────────────────────────┐
│  🌱 Plant Buddy         [설정] [👤] │
├─────────────────────────────────────┤
│  현재: ❄️ 겨울 모드                  │
│                                     │
│  오늘의 할 일 (2건)                  │
│  ┌─────────────────────────────┐    │
│  │ 🪴 회의실 몬스테라   ❄️      │    │
│  │    150ml · 위에서 뿌리기     │    │
│  │    흙 완전히 마른 후 급수     │    │
│  │    [✅ 물주기 완료]          │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🌿 로비 산세베리아   ❄️ ⚠️   │    │
│  │    100ml · 저면관수  · 1일 지남│   │
│  │    [✅ 물주기 완료]          │    │
│  └─────────────────────────────┘    │
│                                     │
│  다음 예정                          │
│  ┌─────────────────────────────┐    │
│  │ 2/25 (화) · 탕비실 스킨답서스  │   │
│  │ 3/03 (월) · 대표님방 행운목    │   │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  [🏠홈]  [🌿식물]  [📅캘린더]       │
└─────────────────────────────────────┘
```

### 7.2 식물 상세 (`/plants/[id]`)

```
┌─────────────────────────────────────┐
│  [← 뒤로]              [수정] (admin)│
├─────────────────────────────────────┤
│  ┌───────────────────────────┐      │
│  │      [식물 사진]          │      │
│  └───────────────────────────┘      │
│  회의실 몬스테라                     │
│  몬스테라 델리시오사 · 3층 회의실 창가│
│  상태: 🟢 건강                      │
│                                     │
│  ── 현재 관리 정보 (❄️ 겨울) ──      │
│  💧 간격: 12일  💦 양: 150ml        │
│  🚿 위에서 뿌리기  ☀️ 간접광         │
│  📝 흙 완전히 마른 후 급수           │
│                                     │
│  ── 계절별 비교 ──                   │
│  🌸 봄   7일/200ml                  │
│  ☀️ 여름  5일/250ml                  │
│  🍂 가을  7일/200ml                  │
│  ❄️ 겨울 12일/150ml ← 현재          │
│                                     │
│  ── 물주기 이력 ──                   │
│  2/12 · 김민수 · 정상 ❄️             │
│  1/31 · 김민수 · 정상 ❄️             │
│  1/20 · 이지연(대리) · 1일 지남      │
│                                     │
│  다음 물주기: 2/24 (월)              │
│  [✅ 물주기 완료]                    │
└─────────────────────────────────────┘
```

---

## 8. 푸시 알림

### 8.1 아키텍처

```
[Vercel Cron] ──→ [/api/cron/send-reminders] ──→ [web-push] ──→ [FCM/APNs] ──→ [브라우저]
[Vercel Cron] ──→ [/api/cron/season-transition] ──→ [plants 업데이트] ──→ [전환 알림 발송]
```

### 8.2 Service Worker

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || '🌱 Plant Buddy', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.data?.url || '/', plantId: data.data?.plantId },
      actions: [
        { action: 'water', title: '✅ 물주기 완료' },
        { action: 'snooze', title: '⏰ 나중에' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'water') {
    event.waitUntil(
      fetch(`/api/plants/${event.notification.data.plantId}/water`, { method: 'POST' })
    );
  }
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### 8.3 알림 시나리오

| 시나리오 | 시점 | 내용 |
|----------|------|------|
| 물주기 예정 | 당일 아침 | "🌱 몬스테라 물줄 시간! 150ml, 위에서 뿌리기 (❄️겨울)" |
| 미완료 리마인더 | 당일 오후 | "⏰ 아직 물 안 준 식물 2그루" |
| 연체 | 예정일+1 매일 | "⚠️ 산세베리아 물주기 1일 지남!" |
| **계절 전환** | 전환일 아침 | "🌸 봄 모드 전환! 몬스테라: 12일→7일, 150→200ml" |
| 위임 요청 | 즉시 | "김민수님이 몬스테라 관리 부탁 (2/24~2/28)" |
| 위임 응답 | 즉시 | "이지연님이 위임 수락" |
| 상태 위험 | 즉시 | "🔴 스킨답서스 위험 상태" (admin) |

### 8.4 iOS 대응

이메일 알림 백업 (`notification_channel: 'push' | 'email' | 'both'`), Resend API 활용.

---

## 9. 핵심 비즈니스 로직

### 9.1 다음 물주기 예정일

```typescript
function calcNextWateringDate(plant: Plant, wateredAt: Date = new Date()): Date {
  return addDays(startOfDay(wateredAt), plant.watering_interval_days);
}
```

### 9.2 현재 담당자 결정 (위임 고려)

```typescript
async function getEffectiveAssignee(plantId: string, date: Date): Promise<string> {
  const delegation = await supabase
    .from('delegations')
    .select('to_user_id')
    .eq('plant_id', plantId)
    .eq('accepted', true)
    .lte('start_date', date.toISOString())
    .gte('end_date', date.toISOString())
    .maybeSingle();

  if (delegation.data) return delegation.data.to_user_id;

  const plant = await supabase
    .from('plants').select('assigned_user_id').eq('id', plantId).single();
  return plant.data.assigned_user_id;
}
```

### 9.3 물주기 완료 전체 플로우

```typescript
async function completeWatering(plantId: string, userId: string, memo?: string) {
  const plant = await getPlant(plantId);
  const today = startOfDay(new Date());

  const effectiveAssignee = await getEffectiveAssignee(plantId, today);
  if (effectiveAssignee !== userId) throw new ForbiddenError();

  const log = await supabase.from('watering_logs').insert({
    plant_id: plantId,
    user_id: userId,
    scheduled_date: plant.next_watering_date,
    was_late: isAfter(today, parseISO(plant.next_watering_date)),
    season: plant.current_season,
    memo
  });

  const nextDate = calcNextWateringDate(plant);
  await supabase.from('plants').update({
    next_watering_date: nextDate.toISOString()
  }).eq('id', plantId);

  return { log: log.data, next_watering_date: nextDate };
}
```

---

## 10. PWA 설정

```json
// manifest.json
{
  "name": "Plant Buddy",
  "short_name": "PlantBuddy",
  "description": "사내 식물 관리 서비스",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2B6CB0",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public', register: true, skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});
module.exports = withPWA({});
```

---

## 11. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:admin@company.com

# Cron
CRON_SECRET=your-cron-secret-here

# Season boundaries (optional override)
SEASON_SPRING_START=03-01
SEASON_SUMMER_START=06-01
SEASON_AUTUMN_START=09-01
SEASON_WINTER_START=12-01

# Email (Phase 2)
RESEND_API_KEY=re_xxx
```

---

## 12. 개발 로드맵

### Phase 1: MVP (4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1주 | 프로젝트 셋업 (Next.js + FSD), DB 스키마 (seasonal_presets 포함), Auth | FSD 보일러플레이트, 마이그레이션, 로그인 |
| 2주 | `entities/` + `features/manage-plant`, 이미지 업로드, 프리셋 CRUD | 식물 CRUD, 프리셋 편집 |
| 3주 | `features/complete-watering` + `widgets/today-tasks`, 알림, 계절 전환 CRON | 대시보드, 푸시, 계절 자동 전환 |
| 4주 | PWA, `widgets/navigation`, 테스트, 배포, 초기 데이터 입력 | Production 배포 |

### Phase 2: 확장 (2주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 5주 | `features/change-plant-status`, `widgets/watering-timeline`, 위임 | 상태 추적, 대리 관리 |
| 6주 | `widgets/admin-stats`, `pages/admin`, 이메일 알림 | 관리자 대시보드 |

### Phase 3: 고도화 (2주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 7주 | `widgets/watering-calendar`, `pages/calendar` | 캘린더 뷰 |
| 8주 | 오프라인 강화, 사진 갤러리, 피드백 반영 | UX 개선 |

---

## 13. 리스크 및 완화

| 리스크 | 영향도 | 가능성 | 완화 방안 |
|--------|--------|--------|----------|
| iOS Safari 푸시 제약 | 높음 | 중간 | 이메일 백업 채널, PWA 설치 가이드 |
| 사용자 참여 저조 | 중간 | 중간 | 알림에서 바로 완료, 미완료 리마인더 |
| 초기 데이터 입력 부담 | 중간 | 높음 | CSV 임포트, 관리자 일괄 입력 |
| 계절 프리셋 관리 번거로움 | 중간 | 중간 | 같은 종 프리셋 복사 기능, 프리셋 없으면 단일 설정 유지 |
| 식물별 관리법 정확도 | 낮음 | 높음 | 기존 문서 기반 입력 후 점진적 보완 |

---

## 14. 부록

### 14.1 초기 데이터 시드

기존 관리 문서에서 추출: 식물 이름/종/위치, **4계절별** 간격/양/방법/메모, 일조량/비료, 담당자.

### 14.2 watering_method 값

| 값 | 설명 | 가이드 |
|-----|------|--------|
| `top` | 위에서 뿌리기 | 흙 위로 천천히 부어준다 |
| `bottom` | 저면관수 | 받침대에 물 담아 흡수 |
| `mist` | 분무 | 스프레이로 잎과 흙에 분무 |
| `other` | 기타 | care_notes에 상세 기재 |

### 14.3 status 값

| 값 | 색상 | 기준 |
|-----|------|------|
| `healthy` | 🟢 | 정상 생장, 잎 색 양호 |
| `caution` | 🟡 | 잎 처짐, 변색 시작, 과습/건조 징후 |
| `danger` | 🔴 | 심한 시듦, 뿌리 썩음, 병충해 |

### 14.4 season 값

| 값 | 아이콘 | 기간 | 경향 |
|-----|--------|------|------|
| `spring` | 🌸 | 3~5월 | 성장 시작, 물 흡수 증가, 비료 시작 |
| `summer` | ☀️ | 6~8월 | 최성기, 가장 빈번, 통풍/과습 주의 |
| `autumn` | 🍂 | 9~11월 | 성장 둔화, 급수 감소, 비료 중단 |
| `winter` | ❄️ | 12~2월 | 휴면기, 최소 급수, 흙 마른 후 급수 |
