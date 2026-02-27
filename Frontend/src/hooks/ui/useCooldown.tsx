import * as React from "react";

export function useCooldown(initialSeconds: number) {
  const [remaining, setRemaining] = React.useState(initialSeconds);

  React.useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  const start = (seconds = initialSeconds) => setRemaining(seconds);

  return {
    remaining,
    isActive: remaining > 0,
    start,
  };
}
