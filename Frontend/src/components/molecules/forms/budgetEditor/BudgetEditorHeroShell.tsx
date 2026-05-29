import CalcBird from "@assets/Images/CalcBird.png";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Default Tailwind classes for the mascot wrapper. Sized for the Expenses
 * hero today; Income (and any future hero) can override via `mascotClassName`.
 */
export const BUDGET_EDITOR_HERO_DEFAULT_MASCOT_CLASS =
  "pointer-events-none absolute right-3 top-[-12px] hidden h-[110px] w-[110px] sm:block lg:right-6 lg:h-[128px] lg:w-[128px]";

/**
 * Default Tailwind classes for the content slot. The right-side padding here
 * keeps the headline clear of the default mascot. Heroes that ship a smaller
 * mascot should pass a matching `contentClassName`.
 */
export const BUDGET_EDITOR_HERO_DEFAULT_CONTENT_CLASS =
  "relative z-[1] max-w-[40rem] pr-0 sm:pr-[128px] lg:pr-[148px]";

type BudgetEditorHeroShellProps = {
  /** Testid on the outer `<section>`. Per-feature (e.g. "expenses-soul-hero"). */
  testId: string;
  /** Testid on the decorative mascot wrapper. */
  mascotTestId?: string;
  /**
   * Slot for the hero content (eyebrow, headline, split line, pills, CTA).
   * The shell handles outer card chrome, decorative blobs, mascot positioning,
   * and the right-side padding that keeps the headline clear of the mascot.
   */
  children: ReactNode;
  /** Optional extra classes appended to the outer section. */
  className?: string;
  /**
   * Override the mascot wrapper classes. Defaults to
   * {@link BUDGET_EDITOR_HERO_DEFAULT_MASCOT_CLASS}. Keep `pointer-events-none`
   * and `absolute` semantics so the mascot stays decorative.
   */
  mascotClassName?: string;
  /**
   * Override the content slot classes. Defaults to
   * {@link BUDGET_EDITOR_HERO_DEFAULT_CONTENT_CLASS}. Tune the right-side
   * padding here when a hero ships a smaller mascot.
   */
  contentClassName?: string;
};

/**
 * Shared money-flow editor hero shell.
 *
 * Provides the compact glass card, decorative shell-tinted blobs, mascot
 * (CalcBird) and content slot used by the Expenses page today and (in PR 2)
 * by the Income page. The mascot is purely decorative — hidden under `sm`
 * and `pointer-events-none` so it never blocks the CTA underneath.
 *
 * The DOM and class output is preserved verbatim from `ExpensesSoulHero` so
 * adoption is a no-op for expenses.
 */
export default function BudgetEditorHeroShell({
  testId,
  mascotTestId,
  children,
  className,
  mascotClassName = BUDGET_EDITOR_HERO_DEFAULT_MASCOT_CLASS,
  contentClassName = BUDGET_EDITOR_HERO_DEFAULT_CONTENT_CLASS,
}: BudgetEditorHeroShellProps) {
  return (
    <section
      data-testid={testId}
      className={cn(
        "relative overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/20 bg-eb-surface/90",
        "px-5 py-6 sm:px-8 sm:py-8",
        "shadow-eb backdrop-blur",
        // Clear the sticky app header (h-16) on scroll-into-view / focus.
        "scroll-mt-20 sm:scroll-mt-24",
        className,
      )}
    >
      {/* Decorative shell-tinted blobs — match the savings hero / prototype. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[10%] h-44 w-44 rounded-full bg-[rgb(var(--eb-shell)/0.28)] blur-3xl" />
        <div className="absolute -top-24 right-[18%] h-52 w-52 rounded-full bg-[rgb(var(--eb-shell-2)/0.10)] blur-3xl" />
      </div>

      {/* CalcBird mascot, hidden on mobile. Sits in the upper-right with a
        soft halo behind it. `pointer-events-none` so it never blocks the CTA
        underneath. Restated from the prototype's `.hero-mascot` and the
        production savings hero pattern. */}
      <div
        aria-hidden="true"
        data-testid={mascotTestId}
        className={mascotClassName}
      >
        <div
          className="absolute inset-[-14px] blur-md"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 40%, rgb(var(--eb-shell-2) / 0.22) 0%, transparent 72%)",
          }}
        />
        <img
          src={CalcBird}
          alt=""
          // Subtle, slow idle float (3s, ±5px, no bounce) to match the calm
          // "alive" feel of the savings page. `motion-safe:` keeps it off for
          // users who prefer reduced motion; the mascot is hidden below `sm`.
          className="relative h-full w-full object-contain motion-safe:animate-img-float"
        />
      </div>

      <div className={contentClassName}>{children}</div>
    </section>
  );
}
