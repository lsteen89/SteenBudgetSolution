import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { saveWizardStep } from '@api/Services/wizard/wizardService';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';

export interface QueueItem {
  stepNumber:      number;
  subStepNumber:   number;
  data:            any;     // Partial<ExpenditureFormValues> or Income slice
  goingBackwards:  boolean;
}

interface WizardSaveQueue {
  queue: QueueItem[];
  enqueue: (item: QueueItem) => void;
  dequeue: (index: number) => void;
  flush: () => Promise<void>;
}

export const useWizardSaveQueue = create<WizardSaveQueue>()(
  persist(
    (set, get) => ({
      queue: [],

      // Add a failed chunk to the end of the queue
      enqueue: (item) =>
        set((s) => ({ queue: [...s.queue, item] })),

      // Remove the i-th item
      dequeue: (i) =>
        set((s) => {
          const q = [...s.queue];
          q.splice(i, 1);
          return { queue: q };
        }),

      // Try to send each queued chunk in order
      flush: async () => {
        const { dequeue } = get();
        let q = get().queue;            // read live queue
        const sessionId = useWizardSessionStore.getState().wizardSessionId;
        if (!sessionId) return;
      
        let i = 0;
        while (i < q.length) {
          const { stepNumber, subStepNumber, data, goingBackwards } = q[i];
          try {
            if (!goingBackwards) {
              await saveWizardStep(
                sessionId,
                stepNumber,
                subStepNumber,
                data
              );
            }
            // success → remove from the **store**
            dequeue(i);
            // after removal, q will shrink, so don’t increment i
          } catch {
            break; // stop on first failure
          }
          // re-read the updated queue before next iteration
          q = get().queue;
        }
      }
    }),
    {
      name: 'wizard-save-queue',     // localStorage key
            storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ queue: state.queue })
      
    }
  )
);
