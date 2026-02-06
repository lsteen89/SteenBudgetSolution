type WizardDividerProps = {
    variant?: "strong" | "subtle";
    className?: string;
};

export function WizardDivider({ variant = "subtle", className }: WizardDividerProps) {
    const stops =
        variant === "strong"
            ? `
        linear-gradient(90deg,
          rgb(var(--wizard-stroke) / 0) 0%,
          rgb(var(--wizard-stroke) / 0.35) 18%,
          rgb(var(--wizard-stroke-strong) / 0.75) 50%,
          rgb(var(--wizard-stroke) / 0.35) 82%,
          rgb(var(--wizard-stroke) / 0) 100%
        )
      `
            : `
        linear-gradient(90deg,
          rgb(var(--wizard-stroke) / 0) 0%,
          rgb(var(--wizard-stroke) / 0.18) 22%,
          rgb(var(--wizard-stroke-strong) / 0.35) 50%,
          rgb(var(--wizard-stroke) / 0.18) 78%,
          rgb(var(--wizard-stroke) / 0) 100%
        )
      `;

    return (
        <div
            className={["h-px w-full max-w-6xl mx-auto", className].filter(Boolean).join(" ")}
            style={{ backgroundImage: stops }}
        />
    );
}
