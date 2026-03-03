'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type { Season } from '@/shared/types';
import { SEASON_ICONS, SEASON_LABELS } from '@/shared/config/seasons';
import { getCurrentSeason } from '@/shared/lib/season';
import { usePlant, PlantPhoto, StatusBadge } from '@/entities/plant';
import { useAuth } from '@/app/providers/AuthProvider';
import { deletePlant } from '@/features/manage-plant';
import { useSeasonalPresets } from '@/features/manage-seasonal-presets';
import { SeasonalPresetEditor } from '@/widgets/seasonal-preset-editor';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

interface PlantDetailPageProps {
  plantId: string;
}

const METHOD_LABELS: Record<string, string> = {
  top: '위에서 뿌리기',
  bottom: '저면관수',
  mist: '분무',
  other: '기타',
};

const SUNLIGHT_LABELS: Record<string, string> = {
  direct: '직사광',
  indirect: '간접광',
  shade: '그늘',
};

export function PlantDetailPage({ plantId }: PlantDetailPageProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { plant, isLoading, error, refetch } = usePlant(plantId);
  const { presets, savePresets } = useSeasonalPresets(plantId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const currentSeason = getCurrentSeason();

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deletePlant(plantId);
      router.push('/plants');
    } catch {
      setIsDeleting(false);
    }
  }, [plantId, router]);

  const handleSavePresets = useCallback(
    async (
      presetsData: Array<{
        season: string;
        enabled: boolean;
        watering_interval_days: number;
        water_amount_ml?: number;
        watering_method?: string;
        care_notes?: string;
      }>,
    ) => {
      await savePresets(presetsData);
      await refetch();
    },
    [savePresets, refetch],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-destructive">
          {error?.message ?? '식물을 찾을 수 없습니다'}
        </p>
        <Button variant="outline" onClick={() => router.push('/plants')}>
          목록으로
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 size-4" />
          뒤로
        </Button>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/plants/${plantId}/edit`}>
                <Pencil className="mr-1 size-4" />
                수정
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-1 size-4" />
              삭제
            </Button>
          </div>
        )}
      </div>

      {/* 사진 + 기본 정보 */}
      <div className="flex flex-col gap-4">
        <PlantPhoto
          photoUrl={plant.photo_url}
          plantName={plant.name}
          className="h-48 w-full"
        />

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{plant.name}</h1>
            {plant.species && (
              <p className="text-muted-foreground">{plant.species}</p>
            )}
          </div>
          <StatusBadge status={plant.status} />
        </div>
      </div>

      {/* 관리 정보 */}
      <div className="rounded-md border p-4">
        <h2 className="mb-3 text-lg font-semibold">관리 정보</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {plant.location && (
            <>
              <dt className="text-muted-foreground">위치</dt>
              <dd>{plant.location}</dd>
            </>
          )}
          <dt className="text-muted-foreground">급수 주기</dt>
          <dd>{plant.watering_interval_days}일</dd>
          {plant.water_amount_ml != null && (
            <>
              <dt className="text-muted-foreground">급수량</dt>
              <dd>{plant.water_amount_ml}ml</dd>
            </>
          )}
          {plant.watering_method && (
            <>
              <dt className="text-muted-foreground">급수 방법</dt>
              <dd>{METHOD_LABELS[plant.watering_method]}</dd>
            </>
          )}
          {plant.sunlight && (
            <>
              <dt className="text-muted-foreground">광량</dt>
              <dd>{SUNLIGHT_LABELS[plant.sunlight]}</dd>
            </>
          )}
          <dt className="text-muted-foreground">다음 물주기</dt>
          <dd>{plant.next_watering_date}</dd>
          <dt className="text-muted-foreground">현재 계절</dt>
          <dd>
            {SEASON_ICONS[plant.current_season]} {SEASON_LABELS[plant.current_season]}
          </dd>
          {plant.assignedUser && (
            <>
              <dt className="text-muted-foreground">담당자</dt>
              <dd>{plant.assignedUser}</dd>
            </>
          )}
        </dl>
        {plant.care_notes && (
          <div className="mt-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">관리 메모</p>
            <p className="text-sm">{plant.care_notes}</p>
          </div>
        )}
      </div>

      {/* 계절별 프리셋 비교 */}
      {plant.presets.length > 0 && (
        <div className="rounded-md border p-4">
          <h2 className="mb-3 text-lg font-semibold">계절별 설정</h2>
          <div className="grid grid-cols-2 gap-2">
            {plant.presets.map((preset) => {
              const isCurrent = preset.season === currentSeason;
              return (
                <div
                  key={preset.id}
                  className={`rounded p-2 text-sm ${isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50'}`}
                >
                  <p className="font-medium">
                    {SEASON_ICONS[preset.season as Season]}{' '}
                    {SEASON_LABELS[preset.season as Season]}
                    {isCurrent && ' (적용 중)'}
                  </p>
                  <p className="text-muted-foreground">
                    {preset.watering_interval_days}일 주기
                    {preset.water_amount_ml && ` · ${preset.water_amount_ml}ml`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* admin: 계절 프리셋 편집기 */}
      {isAdmin && (
        <SeasonalPresetEditor
          existingPresets={presets}
          onSave={handleSavePresets}
        />
      )}

      {/* 물주기 이력 */}
      {plant.recentLogs.length > 0 && (
        <div className="rounded-md border p-4">
          <h2 className="mb-3 text-lg font-semibold">최근 물주기 이력</h2>
          <div className="flex flex-col gap-2">
            {plant.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(log.watered_at).toLocaleDateString('ko-KR')}
                </span>
                {log.season && <span>{SEASON_ICONS[log.season]}</span>}
                <span
                  className={log.was_late ? 'text-amber-600' : 'text-green-600'}
                >
                  {log.was_late ? '지연' : '정상'}
                </span>
                {log.memo && (
                  <span className="text-muted-foreground">- {log.memo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>식물 삭제</DialogTitle>
            <DialogDescription>
              &ldquo;{plant.name}&rdquo;을(를) 정말 삭제하시겠습니까? 관련된 모든
              데이터(물주기 이력, 프리셋 등)가 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
