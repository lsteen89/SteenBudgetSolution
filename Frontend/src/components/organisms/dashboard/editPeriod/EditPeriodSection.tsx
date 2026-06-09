import { cn } from "@/lib/utils";
import React from "react";

type EditPeriodSectionProps = {
  // `ReactNode` so callers can compose a title with adjacent affordances
  // (PR D's salary group renders a "Locked" pill next to the title text).
  // Plain string titles continue to work — the shared `h2` styles them.
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

const EditPeriodSection: React.FC<EditPeriodSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <section
      className={cn(
        "rounded-3xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.32)] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-sm font-extrabold tracking-tight text-eb-text sm:text-base">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-eb-text/65">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
};

export default EditPeriodSection;
