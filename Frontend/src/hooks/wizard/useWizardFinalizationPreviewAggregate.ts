import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { fetchWizardFinalizationPreview } from "@/api/Services/wizard/wizardService";

export function useWizardFinalizationPreviewQuery(sessionId: string | null | undefined) {
    return useQuery({
        queryKey: ["wizardFinalizationPreview", sessionId],
        queryFn: () => fetchWizardFinalizationPreview(sessionId!),
        enabled: !!sessionId,
        staleTime: 0,
        retry: (count, err) => {
            const status = (err as AxiosError)?.response?.status;
            if (status && status >= 400 && status < 500) return false;
            return count < 2;
        },
    });
}
