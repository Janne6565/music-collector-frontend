import { Button } from "@/components/ui";
import { useStore } from "@/local/StoreProvider";
import { DURATION, UNDO_HOLD, restoreCopy } from "@janne6565/music-collector-shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

interface UndoControls {
  /** Called by the delete, once the record is tombstoned. */
  readonly offer: (copyId: string) => void;
  /**
   * The record a reader just took back, so the grid can ring it.
   *
   * A restore and an add are the same event from the library's point of view — something
   * appeared and you need to know where — so they get the same Mark.
   */
  readonly restored: string | null;
}

const UndoContext = createContext<UndoControls | null>(null);

export function useUndo(): UndoControls {
  return useContext(UndoContext) ?? { offer: () => undefined, restored: null };
}

/**
 * The six seconds in which a delete is still a question.
 *
 * Lives above the router rather than on the library page, because the delete happens on
 * the detail page and the toast has to outlive the route that started it.
 */
export function UndoProvider({ children }: { readonly children: ReactNode }) {
  const [pending, setPending] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const offer = useCallback((copyId: string) => {
    setPending(copyId);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPending(null), UNDO_HOLD);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <UndoContext.Provider value={{ offer, restored }}>
      {children}
      {pending !== null && (
        <UndoToast
          copyId={pending}
          onDone={(copyId) => {
            window.clearTimeout(timer.current);
            setPending(null);
            setRestored(copyId);
          }}
        />
      )}
    </UndoContext.Provider>
  );
}

function UndoToast({
  copyId,
  onDone,
}: { readonly copyId: string; readonly onDone: (copyId: string) => void }) {
  const { t } = useTranslation();
  const { store, clock } = useStore();
  const queryClient = useQueryClient();

  return (
    // <output> rather than a div with role="status": same announcement, one fewer
    // attribute to get wrong. Lift, like everything else that sits over something else,
    // but it leaves at slow — nobody dismissed it, it simply ran out, and a toast that
    // snaps away reads as an error you missed.
    <output
      className="mc-lift fixed inset-x-0 bottom-6 z-50 flex justify-center"
      style={{ transitionDuration: `${DURATION.slow}ms` }}
    >
      <div className="flex items-center gap-4 rounded-xl bg-ink px-4 py-2.5 text-paper shadow-[0_12px_32px_rgba(25,23,19,.34)]">
        <span className="text-[12.5px]">{t("undo.removed")}</span>
        <Button
          variant="secondary"
          onClick={async () => {
            const copy = await store.getCopyIncludingDeleted(copyId);
            if (copy === undefined) return;
            await store.putCopy(restoreCopy(copy, clock));
            await queryClient.invalidateQueries({ queryKey: ["copies"] });
            await queryClient.invalidateQueries({ queryKey: ["stats"] });
            onDone(copyId);
          }}
          className="h-[26px] rounded-md border-0 bg-paper/15 px-2.5 text-[12px] font-semibold text-paper hover:bg-paper/25"
        >
          {t("undo.action")}
        </Button>
      </div>
    </output>
  );
}
