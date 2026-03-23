import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import { saveWizardStep } from "@api/Services/wizard/wizardService";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface QueueItem {
  sessionId: string;
  stepNumber: number;
  subStepNumber: number;
  data: any;
  goingBackwards: boolean;
  ts?: number;
}

// callers should NOT provide sessionId/ts
export type EnqueueItem = Omit<QueueItem, "sessionId" | "ts">;

interface WizardSaveQueue {
  queue: QueueItem[];
  enqueue: (item: EnqueueItem) => void;
  dequeue: (index: number) => void;
  flush: () => Promise<void>;
  clearQueue: () => void;
  removeByKey: (step: number, sub: number) => void;
}

const keyOf = (i: QueueItem) =>
  `${i.sessionId}:${i.stepNumber}:${i.subStepNumber}`;

export const useWizardSaveQueue = create<WizardSaveQueue>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (item) =>
        set((s) => {
          const sessionId = useWizardSessionStore.getState().wizardSessionId;
          if (!sessionId) return s;

          // deep snapshot NOW to avoid later mutation
          const snap = JSON.parse(JSON.stringify(item.data));

          const withMeta: QueueItem = {
            ...item,
            sessionId,
            data: snap,
            ts: Date.now(),
          };

          const k = keyOf(withMeta);
          const idx = s.queue.findIndex((qi) => keyOf(qi) === k);

          if (idx >= 0) {
            const next = [...s.queue];
            next[idx] = withMeta;
            console.log("[QUEUE] replaced", k, Object.keys(withMeta.data));
            return { queue: next };
          }

          console.log("[QUEUE] enqueued", k, Object.keys(withMeta.data));
          return { queue: [...s.queue, withMeta] };
        }),

      dequeue: (i) =>
        set((s) => {
          const q = [...s.queue];
          q.splice(i, 1);
          return { queue: q };
        }),

      removeByKey: (step, sub) =>
        set((s) => ({
          queue: s.queue.filter(
            (qi) => !(qi.stepNumber === step && qi.subStepNumber === sub),
          ),
        })),

      flush: async () => {
        const sessionId = useWizardSessionStore.getState().wizardSessionId;
        if (!sessionId) return;

        // ✅ only flush items belonging to THIS session
        const getQueueForSession = () =>
          get().queue.filter((qi) => qi.sessionId === sessionId);

        let q = getQueueForSession();
        let i = 0;

        while (i < q.length) {
          const { stepNumber, subStepNumber, data, goingBackwards } = q[i];

          try {
            if (!goingBackwards) {
              console.log("[WSQ] Flushing queued step", {
                sessionId,
                stepNumber,
                subStepNumber,
                keys: Object.keys(data),
              });

              await saveWizardStep(sessionId, stepNumber, subStepNumber, data);
            }

            // ✅ remove it from persisted store
            set((s) => ({
              queue: s.queue.filter(
                (qi) =>
                  !(
                    qi.sessionId === sessionId &&
                    qi.stepNumber === stepNumber &&
                    qi.subStepNumber === subStepNumber
                  ),
              ),
            }));

            q = getQueueForSession(); // re-read
          } catch (e) {
            console.warn(
              "[WSQ] Flush failed, stopping",
              {
                sessionId,
                stepNumber,
                subStepNumber,
              },
              e,
            );
            break;
          }
        }
      },

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: "wizard-save-queue",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
