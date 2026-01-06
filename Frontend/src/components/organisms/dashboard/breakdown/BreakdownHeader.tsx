import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";

type Props = {
    title: string;
    equation: React.ReactNode;
};

const BreakdownHeader: React.FC<Props> = ({ title, equation }) => {
    return (
        <header className="w-full mb-10 lg:mb-16">
            <div className="mx-auto w-full max-w-3xl px-4 text-center">
                {/* Hero card */}
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/65 backdrop-blur-sm shadow-sm px-4 py-6 sm:px-6 sm:py-8">
                    {/* Playful gradient + pattern overlay */}
                    <div
                        className="
              pointer-events-none absolute inset-0
              bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-emerald-400/10
            "
                    />

                    <div
                        className="
              pointer-events-none absolute inset-0 opacity-[0.55]
              [background-image:radial-gradient(rgba(99,102,241,0.22)_1px,transparent_1px)]
              [background-size:18px_18px]
            "
                    />

                    {/* Soft blobs (very light) */}
                    <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 right-[-40px] h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl" />

                    {/* Content */}
                    <div className="relative">
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                            <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                                    {title}
                                </span>
                            </h1>

                            <Link
                                to="/dashboard"
                                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                  bg-white/70 backdrop-blur
                  text-[11px] font-bold uppercase tracking-wider
                  text-slate-500 hover:text-slate-900 transition
                  border border-slate-200/70 shadow-sm
                "
                                aria-label="Back to dashboard"
                            >
                                <ChevronLeft size={14} />
                                <span>Till Dashboard</span>
                            </Link>
                        </div>

                        {/* Cute divider */}
                        <div className="mt-4 flex items-center justify-center gap-2">
                            <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent" />
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                                <Sparkles size={12} />
                                Breakdown
                            </span>
                            <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent via-emerald-400/35 to-transparent" />
                        </div>

                        {/* Equation pill */}
                        <div className="mt-5 flex justify-center">
                            <div className="inline-flex items-center rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur px-4 py-2 shadow-sm">
                                <div className="text-sm lg:text-base text-slate-600 tabular-nums font-medium">
                                    {equation}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default BreakdownHeader;
