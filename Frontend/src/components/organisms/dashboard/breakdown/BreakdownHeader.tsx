import React from "react";
import { useNavigate } from "react-router-dom";

type Props = {
    title: string;
    equation: React.ReactNode;
};

const BreakdownHeader: React.FC<Props> = ({ title, equation }) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-start justify-between gap-3">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="text-sm text-slate-600 mt-1">{equation}</p>
            </div>

            <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="shrink-0 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-white/70 border border-slate-200 text-slate-800 hover:bg-slate-50 transition"
            >
                Till dashboard
            </button>
        </div>
    );
};

export default BreakdownHeader;
