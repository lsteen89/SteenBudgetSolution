import MainPageBird from "@assets/Images/MainPageBird.png";
import {
  BookOpenIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import "@styles/animations.css";
import React from "react";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  return (
    <main className="relative">
      {/* subtle shell wash */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--eb-shell)/0.22)] to-transparent" />

      <section className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14 pb-12 sm:pb-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Hero card */}
          <div
            className={[
              "rounded-2xl p-6 sm:p-8",
              "bg-eb-surface/90 backdrop-blur-md",
              "border border-eb-stroke/30",
              "shadow-[0_18px_50px_rgba(21,39,81,0.12)]",
              "text-eb-text",
            ].join(" ")}
          >
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
              Calm budgeting
            </p>

            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ta kontroll över din ekonomi med{" "}
              <span className="text-eb-accent">eBudget</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-eb-text/70 max-w-prose">
              Planera månaden, följ upp och justera i lugn takt — utan
              kalkylblad.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/registration"
                className={[
                  "h-12 px-6 rounded-2xl font-semibold",
                  "inline-flex items-center justify-center",
                  "bg-eb-accent text-white",
                  "shadow-[0_14px_28px_rgba(34,197,94,0.18)]",
                  "hover:brightness-[0.98] active:brightness-[0.95]",
                  "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/40",
                ].join(" ")}
              >
                Skaffa eBudget
              </Link>

              <Link
                to="/faq"
                className={[
                  "h-12 px-6 rounded-2xl font-semibold",
                  "inline-flex items-center justify-center",
                  "bg-eb-surface/75 border border-eb-stroke/30",
                  "text-eb-text/80 hover:text-eb-text",
                  "hover:bg-eb-surfaceAccent/60",
                  "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/40",
                ].join(" ")}
              >
                Vanliga frågor
              </Link>
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              <li className="flex items-start gap-3">
                <BookOpenIcon className="h-5 w-5 text-eb-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Enkel planering</p>
                  <p className="text-sm text-eb-text/60">Kom igång snabbt.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <ChartBarIcon className="h-5 w-5 text-eb-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Tydlig översikt</p>
                  <p className="text-sm text-eb-text/60">Se läget direkt.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-eb-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Säkerhet först</p>
                  <p className="text-sm text-eb-text/60">Alltid skyddat.</p>
                </div>
              </li>
            </ul>

            <div className="mt-8 rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 p-4">
              <p className="text-sm text-eb-text/60">
                Vi säljer aldrig din data. Läs mer i{" "}
                <Link
                  to="/data-policy"
                  className="underline text-eb-text/70 hover:text-eb-text"
                >
                  integritetspolicyn
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Mascot */}
          <div className="flex justify-center md:justify-end">
            <img
              src={MainPageBird}
              alt="eBudget"
              draggable={false}
              className="w-[min(520px,92%)] h-auto img-float hover:animate-img-flap motion-reduce:animate-none"
            />
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
