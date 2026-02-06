import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { fetchWizardFinalizationPreview } from "@/api/Services/wizard/wizardService";

type Options = {
  enabled?: boolean;
};

export function useWizardFinalizationPreviewQuery(sessionId: string | null | undefined, opts?: Options) {
  return useQuery({
    queryKey: ["wizardFinalizationPreview", sessionId],
    queryFn: () => fetchWizardFinalizationPreview(sessionId!),
    enabled: (opts?.enabled ?? true) && !!sessionId,
    staleTime: 0,
    gcTime: 60_000,
    placeholderData: (prev) => prev,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false; // don't retry 4xx
      return count < 2;
    },
  });
}
