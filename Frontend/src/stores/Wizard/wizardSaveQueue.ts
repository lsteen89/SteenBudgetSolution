import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { saveWizardStep } from '@api/Services/wizard/wizardService';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';

export interface QueueItem {
  stepNumber: number;
  subStepNumber: number;
  data: any;
  goingBackwards: boolean;
  ts?: number;            // debug/tie-break
}

interface WizardSaveQueue {
  queue: QueueItem[];
  enqueue: (item: QueueItem) => void;
  dequeue: (index: number) => void;
  flush: () => Promise<void>;
  clearQueue: () => void;
  removeByKey: (step: number, sub: number) => void; // convenience
}

const keyOf = (i: QueueItem) => `${i.stepNumber}:${i.subStepNumber}`;

export const useWizardSaveQueue = create<WizardSaveQueue>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (item) =>
        set((s) => {
          // deep snapshot NOW to avoid later mutation
          const snap = JSON.parse(JSON.stringify(item.data));
          const withMeta: QueueItem = { ...item, data: snap, ts: Date.now() };

          const k = keyOf(item);
          const idx = s.queue.findIndex(qi => keyOf(qi) === k);

          if (idx >= 0) {
            // replace existing entry for this step/substep
            const next = [...s.queue];
            next[idx] = withMeta;
            return { queue: next };
          }

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
          queue: s.queue.filter(qi => !(qi.stepNumber === step && qi.subStepNumber === sub)),
        })),

      flush: async () => {
        const { dequeue } = get();
        let q = get().queue;
        const sessionId = useWizardSessionStore.getState().wizardSessionId;
        if (!sessionId) return;

        // optional: sort by ts to send latest coalesced order (not required if we replace in-place)
        // q = [...q].sort((a,b) => (a.ts ?? 0) - (b.ts ?? 0));

        // iterate by index because we mutate the store on success
        let i = 0;
        while (i < q.length) {
          const { stepNumber, subStepNumber, data, goingBackwards } = q[i];
          try {
            if (!goingBackwards) {
              console.log('[WSQ] Flushing queued step', { stepNumber, subStepNumber, data });
              await saveWizardStep(sessionId, stepNumber, subStepNumber, data);
            }
            dequeue(i);         // removes the i-th element
            q = get().queue;    // re-read
          } catch (e) {
            // stop on first failure; keep the rest queued
            break;
          }
        }
      },

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'wizard-save-queue',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);
