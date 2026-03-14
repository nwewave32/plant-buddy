'use client';

import { useState } from 'react';
import { Droplets } from 'lucide-react';
import { useCompleteWatering } from '../model/useCompleteWatering';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Textarea } from '@/shared/ui/textarea';

interface WateringButtonProps {
  plantId: string;
  onSuccess: () => void;
}

export function WateringButton({ plantId, onSuccess }: WateringButtonProps) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const { submitWatering, isSubmitting, error } = useCompleteWatering(plantId);

  const handleConfirm = async () => {
    await submitWatering(memo || undefined, () => {
      setOpen(false);
      setMemo('');
      onSuccess();
    });
  };

  return (
    <>
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        <Droplets className="mr-2 size-5" />
        물주기 완료
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>물주기 완료</DialogTitle>
            <DialogDescription>
              메모를 남길 수 있습니다 (선택사항)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="예: 잎이 살짝 처져있었음"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
          />

          {error && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? '기록 중...' : '완료'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
