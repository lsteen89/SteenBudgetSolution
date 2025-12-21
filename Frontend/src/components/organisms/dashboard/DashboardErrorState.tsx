import React from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/utils/cn";

type Props = {
    message: string;
    onRetry: () => void;
    title?: string;
    details?: string;
    className?: string;
};

const DashboardErrorState: React.FC<Props> = ({
    title = "Something went wrong",
    message,
    onRetry,
    details,
    className,
}) => {
    return (
        <div className={cn("w-full max-w-5xl", className)}>
            <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm p-6">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-2xl bg-rose-50 border border-rose-100 p-2">
                        <TriangleAlert className="h-5 w-5 text-rose-600" />
                    </div>

                    <div className="flex-1">
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        <p className="mt-1 text-sm text-slate-600">{message}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={onRetry}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Retry
                            </button>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                            >
                                Reload page
                            </button>
                        </div>

                        {details && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                                    Details
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-950 text-slate-100 p-3 text-xs overflow-auto">
                                    {details}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardErrorState;
