import React from "react";
import { Wallet, Receipt, PiggyBank, Landmark, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";

import GlassPane from "@components/layout/GlassPane";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { BudgetGuideSkeleton } from "@/components/atoms/loading/BudgetGuideSkeleton";
import { cn } from "@/utils/twMerge";
import logo from "@/assets/Images/eBudgetLogo.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";


interface StepWelcomeProps {
  connectionError: boolean;
  failedAttempts: number;
  loading: boolean;
  onRetry: () => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({
  connectionError,
  failedAttempts,
  loading,
  onRetry,
}) => {
  const { user } = useAuth();
  const retriesLocked = failedAttempts > 3;

  if (loading) {
    return (
      <GlassPane>
        <div className="min-h-48 flex items-center justify-center">
          <BudgetGuideSkeleton />
        </div>
      </GlassPane>
    );
  }

  return (

    <div className="relative">
      {/* Watermark */}
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="
        pointer-events-none select-none
        absolute left-1/2 top-32 -translate-x-1/2
        w-[780px] max-w-[115%]
        opacity-[0.07]
        blur-[0.8px]
      "
      />
      <section className="mx-auto w-full max-w-xl px-4 sm:px-6 pt-2 pb-4 md:pt-5 md:pb-safe md:py-8">
        {connectionError ? (
          <div className="space-y-4">
            <div className={cn(
              "rounded-2xl p-4 md:p-5",
              "bg-wizard-surface2 border border-wizard-stroke",
              "shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            )}>
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-rose-500" />
                <div className="space-y-2">
                  <p className="font-semibold text-wizard-text">Anslutningsproblem</p>
                  <p className="text-sm leading-relaxed text-wizard-muted">
                    Vi kan för närvarande inte spara eller hämta data. Försök igen, eller kontakta support om problemet kvarstår.
                  </p>

                  <p className="text-sm text-wizard-muted">
                    <a href="mailto:support@ebudget.se" className="underline underline-offset-2">
                      support@ebudget.se
                    </a>{" "}
                    eller <Link to="/contact" className="underline underline-offset-2">kontakta oss här</Link>.
                  </p>

                  {retriesLocked ? (
                    <p className="text-sm font-semibold text-rose-600">
                      Inga fler försök kan göras. Vänligen kontakta support.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={retriesLocked}
                    className={cn(
                      "relative flex items-center gap-4 rounded-2xl px-5 py-4",
                      "bg-wizard-surface border border-wizard-stroke/25",
                      "shadow-[0_1px_6px_rgba(21,39,81,0.04)]",
                      "transition",
                      "hover:border-wizard-stroke/40 hover:shadow-[0_4px_12px_rgba(21,39,81,0.06)]"
                    )}
                  >
                    Försök igen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <WizardMascot
                  src={logo}
                  size={72}
                  showText={false}
                  className="md:hidden"
                  hello
                  float
                />
                <WizardMascot
                  src={logo}
                  size={92}
                  showText
                  className="hidden md:flex"
                  hello
                  float
                />
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-wizard-text">
                Kom igång med din budget
              </h2>

              <p className="mx-auto max-w-md text-sm leading-relaxed text-wizard-muted">
                {user?.firstName
                  ? `Kul att du är här, ${user.firstName}. Vi börjar med några snabba uppgifter.`
                  : "Kul att du är här. Vi börjar med några snabba uppgifter."}
              </p>

              <p className="text-sm text-wizard-muted">
                <span className="font-semibold text-wizard-text">5–10 minuter</span> • pausa när som helst • vi sparar automatiskt
              </p>
            </div>

            {/* What you'll do */}
            <div className="mx-auto max-w-xl">
              <p className="text-center text-sm font-semibold text-wizard-text">Det här händer nu.</p>

              <ul className="mt-4 grid gap-3">
                {[
                  { Icon: Wallet, title: "Inkomster", desc: "vad du får in och hur ofta" },
                  { Icon: Receipt, title: "Utgifter", desc: "fasta & rörliga kostnader" },
                  { Icon: PiggyBank, title: "Sparande", desc: "buffert, mål och sparande" },
                  { Icon: Landmark, title: "Skulder", desc: "lån, krediter och återbetalning" },
                  { Icon: CheckCircle, title: "Bekräfta", desc: "sammanfattning innan du skapar budgeten" },
                ].map(({ Icon, title, desc }) => (
                  <li
                    key={title}
                    className={cn(
                      "relative flex items-center gap-4 rounded-2xl px-5 py-4",
                      "bg-wizard-surface border border-wizard-stroke/25",
                      "shadow-[0_1px_6px_rgba(21,39,81,0.04)]",
                      "transition",
                      "hover:border-wizard-stroke/40 hover:shadow-[0_4px_12px_rgba(21,39,81,0.06)]"
                    )}
                  >
                    {/* Icon Container: Make it bigger and more vibrant */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-wizard-accentSoft text-wizard-accent">
                      <Icon className="h-5 w-5 stroke-[2.25px]" />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-extrabold tracking-tight text-wizard-text">
                        {title}
                      </span>
                      <span className="text-sm font-medium text-wizard-text/70 leading-snug">
                        {desc}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

            </div>


          </div>
        )}
      </section>

    </div>

  );
};

export default StepWelcome;
