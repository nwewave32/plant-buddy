// === Season ===
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// === User ===
export type UserRole = 'member' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  notification_time: string;
  created_at: string;
}

// === Plant ===
export type WateringMethod = 'top' | 'bottom' | 'mist' | 'other';
export type Sunlight = 'direct' | 'indirect' | 'shade';
export type PlantStatus = 'healthy' | 'caution' | 'danger';

export interface Plant {
  id: string;
  name: string;
  species: string | null;
  photo_url: string | null;
  location: string | null;
  assigned_user_id: string | null;
  watering_interval_days: number;
  water_amount_ml: number | null;
  watering_method: WateringMethod | null;
  sunlight: Sunlight | null;
  care_notes: string | null;
  status: PlantStatus;
  current_season: Season;
  next_watering_date: string;
  created_at: string;
}

// === Seasonal Preset ===
export interface SeasonalPreset {
  id: string;
  plant_id: string;
  season: Season;
  watering_interval_days: number;
  water_amount_ml: number | null;
  watering_method: WateringMethod | null;
  care_notes: string | null;
}

// === Watering Log ===
export interface WateringLog {
  id: string;
  plant_id: string;
  user_id: string;
  watered_at: string;
  scheduled_date: string;
  was_late: boolean;
  season: Season | null;
  memo: string | null;
}

// === Status Log ===
export interface StatusLog {
  id: string;
  plant_id: string;
  user_id: string;
  status: PlantStatus;
  memo: string | null;
  changed_at: string;
}

// === Delegation ===
export interface Delegation {
  id: string;
  plant_id: string;
  from_user_id: string;
  to_user_id: string;
  start_date: string;
  end_date: string;
  accepted: boolean | null;
  created_at: string;
}

// === Push Subscription ===
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  created_at: string;
}

// === Database type helper for Supabase ===
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at'>; Update: Partial<User> };
      plants: { Row: Plant; Insert: Omit<Plant, 'id' | 'created_at'>; Update: Partial<Plant> };
      seasonal_presets: { Row: SeasonalPreset; Insert: Omit<SeasonalPreset, 'id'>; Update: Partial<SeasonalPreset> };
      watering_logs: { Row: WateringLog; Insert: Omit<WateringLog, 'id' | 'watered_at'>; Update: Partial<WateringLog> };
      status_logs: { Row: StatusLog; Insert: Omit<StatusLog, 'id' | 'changed_at'>; Update: Partial<StatusLog> };
      delegations: { Row: Delegation; Insert: Omit<Delegation, 'id' | 'created_at'>; Update: Partial<Delegation> };
      push_subscriptions: { Row: PushSubscription; Insert: Omit<PushSubscription, 'id' | 'created_at'>; Update: Partial<PushSubscription> };
    };
  };
}
