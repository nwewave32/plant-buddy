'use client';

import { useState } from 'react';
import type { Season, SeasonalPreset } from '@/shared/types';
import { SEASON_ICONS, SEASON_LABELS } from '@/shared/config/seasons';
import { getCurrentSeason } from '@/shared/lib/season';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { usePresetForm } from '../model/usePresetForm';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

const WATERING_METHODS = [
  { value: 'top', label: '위에서 뿌리기' },
  { value: 'bottom', label: '저면관수' },
  { value: 'mist', label: '분무' },
  { value: 'other', label: '기타' },
];

interface SeasonalPresetEditorProps {
  existingPresets: SeasonalPreset[];
  onSave: (
    presets: Array<{
      season: string;
      enabled: boolean;
      watering_interval_days: number;
      water_amount_ml?: number;
      watering_method?: string;
      care_notes?: string;
    }>,
  ) => Promise<void>;
}

export function SeasonalPresetEditor({
  existingPresets,
  onSave,
}: SeasonalPresetEditorProps) {
  const {
    formState,
    activeSeason,
    setActiveSeason,
    updateEntry,
    errors,
    validate,
    getPresetsData,
  } = usePresetForm(existingPresets);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const currentSeason = getCurrentSeason();

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(getPresetsData());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold">계절별 관리 프리셋</h3>

      <Tabs
        value={activeSeason}
        onValueChange={(v) => setActiveSeason(v as Season)}
      >
        <TabsList className="w-full">
          {SEASONS.map((season) => (
            <TabsTrigger key={season} value={season} className="flex-1">
              {SEASON_ICONS[season]} {SEASON_LABELS[season]}
              {season === currentSeason && ' (현재)'}
            </TabsTrigger>
          ))}
        </TabsList>

        {SEASONS.map((season) => {
          const entry = formState[season];
          return (
            <TabsContent key={season} value={season} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id={`${season}-enabled`}
                  checked={entry.enabled}
                  onCheckedChange={(checked) =>
                    updateEntry(season, 'enabled', checked)
                  }
                />
                <Label htmlFor={`${season}-enabled`}>
                  프리셋 사용
                </Label>
              </div>

              {entry.enabled && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>급수 주기(일)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={entry.watering_interval_days}
                      onChange={(e) =>
                        updateEntry(
                          season,
                          'watering_interval_days',
                          Number(e.target.value),
                        )
                      }
                    />
                    {errors[`${season}.watering_interval_days`] && (
                      <p className="text-sm text-destructive">
                        {errors[`${season}.watering_interval_days`]}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>급수량(ml)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={entry.water_amount_ml}
                      onChange={(e) =>
                        updateEntry(season, 'water_amount_ml', e.target.value)
                      }
                      placeholder="예: 200"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>급수 방법</Label>
                    <Select
                      value={entry.watering_method}
                      onValueChange={(v) =>
                        updateEntry(season, 'watering_method', v)
                      }
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

                  <div className="flex flex-col gap-2">
                    <Label>관리 메모</Label>
                    <Textarea
                      value={entry.care_notes}
                      onChange={(e) =>
                        updateEntry(season, 'care_notes', e.target.value)
                      }
                      placeholder="이 계절 관리 참고사항"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* 전체 계절 요약 */}
      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          전체 계절 요약
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {SEASONS.map((season) => {
            const entry = formState[season];
            const isCurrent = season === currentSeason;
            return (
              <div
                key={season}
                className={`rounded p-2 ${isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50'}`}
              >
                <span className="font-medium">
                  {SEASON_ICONS[season]} {SEASON_LABELS[season]}
                  {isCurrent && ' (적용 중)'}
                </span>
                {entry.enabled ? (
                  <p className="text-muted-foreground">
                    {entry.watering_interval_days}일 주기
                    {entry.water_amount_ml && ` · ${entry.water_amount_ml}ml`}
                  </p>
                ) : (
                  <p className="text-muted-foreground">미설정</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? '저장 중...' : '프리셋 저장'}
      </Button>
    </div>
  );
}
