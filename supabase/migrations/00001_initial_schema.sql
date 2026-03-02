-- ============================================
-- Plant Buddy — Initial Schema
-- ============================================

-- 1. users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  notification_time time DEFAULT '09:00',
  created_at timestamptz DEFAULT now()
);

-- 2. plants
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

-- 3. seasonal_presets
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

-- 4. watering_logs
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

-- 5. status_logs
CREATE TABLE status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('healthy', 'caution', 'danger')),
  memo text,
  changed_at timestamptz DEFAULT now()
);

-- 6. delegations
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

-- 7. push_subscriptions
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- plants
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plants_select_all" ON plants FOR SELECT USING (true);
CREATE POLICY "plants_insert_admin" ON plants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "plants_update_admin_or_assigned" ON plants FOR UPDATE
  USING (
    assigned_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- seasonal_presets
ALTER TABLE seasonal_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presets_select_all" ON seasonal_presets FOR SELECT USING (true);
CREATE POLICY "presets_modify_admin" ON seasonal_presets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- watering_logs
ALTER TABLE watering_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_insert_own" ON watering_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "logs_select" ON watering_logs FOR SELECT USING (true);
