'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/providers/SupabaseProvider';
import type { Plant, User } from '@/shared/types';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { usePlantForm } from '../model/usePlantForm';

interface PlantFormProps {
  mode: 'create' | 'edit';
  plantId?: string;
  initialData?: Plant;
}

const WATERING_METHODS = [
  { value: 'top', label: '위에서 뿌리기' },
  { value: 'bottom', label: '저면관수' },
  { value: 'mist', label: '분무' },
  { value: 'other', label: '기타' },
];

const SUNLIGHT_OPTIONS = [
  { value: 'direct', label: '직사광' },
  { value: 'indirect', label: '간접광' },
  { value: 'shade', label: '그늘' },
];

export function PlantForm({ mode, plantId, initialData }: PlantFormProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [users, setUsers] = useState<Pick<User, 'id' | 'name'>[]>([]);

  const {
    formData,
    updateField,
    imagePreview,
    handleImageChange,
    errors,
    isSubmitting,
    submit,
  } = usePlantForm({
    mode,
    plantId,
    initialData,
    onSuccess: (plant) => {
      router.push(`/plants/${plant.id}`);
    },
  });

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('users')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setUsers(data);
      });
  }, [supabase]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      {errors._form && (
        <p className="text-sm text-destructive">{errors._form}</p>
      )}

      {/* 이름 (필수) */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          식물 이름 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="예: 몬스테라"
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* 종 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="species">종</Label>
        <Input
          id="species"
          value={formData.species}
          onChange={(e) => updateField('species', e.target.value)}
          placeholder="예: Monstera deliciosa"
        />
      </div>

      {/* 위치 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">위치</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => updateField('location', e.target.value)}
          placeholder="예: 3층 회의실"
        />
      </div>

      {/* 급수 주기 (필수) */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="watering_interval_days">
          급수 주기(일) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="watering_interval_days"
          type="number"
          min={1}
          value={formData.watering_interval_days}
          onChange={(e) => updateField('watering_interval_days', Number(e.target.value))}
        />
        {errors.watering_interval_days && (
          <p className="text-sm text-destructive">{errors.watering_interval_days}</p>
        )}
      </div>

      {/* 급수량 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="water_amount_ml">급수량(ml)</Label>
        <Input
          id="water_amount_ml"
          type="number"
          min={1}
          value={formData.water_amount_ml}
          onChange={(e) => updateField('water_amount_ml', e.target.value)}
          placeholder="예: 200"
        />
      </div>

      {/* 급수 방법 */}
      <div className="flex flex-col gap-2">
        <Label>급수 방법</Label>
        <Select
          value={formData.watering_method}
          onValueChange={(v) => updateField('watering_method', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {WATERING_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 광량 */}
      <div className="flex flex-col gap-2">
        <Label>광량</Label>
        <Select
          value={formData.sunlight}
          onValueChange={(v) => updateField('sunlight', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {SUNLIGHT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 다음 물주기 (필수) */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="next_watering_date">
          다음 물주기 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="next_watering_date"
          type="date"
          value={formData.next_watering_date}
          onChange={(e) => updateField('next_watering_date', e.target.value)}
        />
        {errors.next_watering_date && (
          <p className="text-sm text-destructive">{errors.next_watering_date}</p>
        )}
      </div>

      {/* 담당자 */}
      <div className="flex flex-col gap-2">
        <Label>담당자</Label>
        <Select
          value={formData.assigned_user_id}
          onValueChange={(v) => updateField('assigned_user_id', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 관리 메모 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="care_notes">관리 메모</Label>
        <Textarea
          id="care_notes"
          value={formData.care_notes}
          onChange={(e) => updateField('care_notes', e.target.value)}
          placeholder="관리 시 참고사항을 입력하세요"
          rows={3}
        />
      </div>

      {/* 사진 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">사진</Label>
        <Input
          id="photo"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            handleImageChange(file);
          }}
        />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="미리보기"
            className="h-40 w-40 rounded-md object-cover"
          />
        )}
      </div>

      {/* 제출 */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : mode === 'create' ? '등록' : '수정'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
      </div>
    </form>
  );
}
