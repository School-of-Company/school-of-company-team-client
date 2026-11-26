"use client";
import { useRouter } from "next/navigation";
import {
  experimentApi,
  experimentErrorMessage,
  type Experiment,
} from "@/entities/experiment";
import { useExperimentMutation } from "@/features/manage-experiment";
import { routes } from "@/shared/config";
import { Button, Dialog } from "@/shared/ui";

export function LabDeleteDialog({
  open,
  experiment,
  onClose,
}: {
  readonly open: boolean;
  readonly experiment: Experiment;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const remove = useExperimentMutation(() =>
    experimentApi.remove(experiment.id),
  );
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!remove.isPending) onClose();
      }}
      title="실험을 삭제할까요?"
    >
      <p className="mb-6 text-sm text-muted">
        가설과 결과 기록이 모두 사라져요. 연결된 업무, 문서는 그대로 남아요.
      </p>
      {remove.isError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {experimentErrorMessage(remove.error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={remove.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => router.replace(routes.labs),
            })
          }
        >
          삭제
        </Button>
      </div>
    </Dialog>
  );
}
