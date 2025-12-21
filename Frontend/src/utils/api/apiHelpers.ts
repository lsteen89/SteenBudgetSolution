import axios from "axios";
import type { ApiEnvelope, ApiProblem } from "@/api/api.types";

// Use this when the server returns 200 but IsSuccess=false
export function unwrapEnvelope<T>(env: ApiEnvelope<T>): T {
    if (env.isSuccess) {
        if (env.data == null) throw { message: "Empty response data from server." } as ApiProblem;
        return env.data;
    }

    // Envelope failure (business/validation/etc)
    const problem: ApiProblem = {
        message: env.error?.message ?? "Request failed.",
        code: env.error?.code ?? "UNKNOWN",
    };

    throw problem;
}

// Use this in catch blocks for axios errors (non-2xx, network, etc)
export function toApiProblem(err: unknown): ApiProblem {
    // If we already threw an ApiProblem (from unwrapEnvelope), keep it.
    if (isApiProblem(err)) return err;

    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const isNetworkError = !err.response;

        // If backend returns an ApiEnvelope even on non-2xx, we can extract it:
        const data = err.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
        const envelopeError = data?.error;

        return {
            message:
                envelopeError?.message ??
                err.message ??
                "Request failed.",
            code: envelopeError?.code,
            status,
            isNetworkError,
            raw: err,
        };
    }

    if (err instanceof Error) return { message: err.message, raw: err };
    return { message: "Unexpected error.", raw: err };
}

function isApiProblem(x: unknown): x is ApiProblem {
    return typeof x === "object" && x !== null && "message" in x;
}
