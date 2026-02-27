import * as React from "react";
import { cn } from "@/lib/utils";

type PadY = "none" | "sm" | "md" | "lg";

const padYMap: Record<PadY, string> = {
  none: "py-0",
  sm: "py-6 sm:py-10",
  md: "py-10 sm:py-16",
  lg: "py-10 sm:py-20",
};

export type PageContainerProps = React.ComponentPropsWithoutRef<"main"> & {
  /** Center children both axes (rare). Prefer centering inside content instead. */
  centerChildren?: boolean;

  /** New API: explicit padding scale */
  padY?: PadY;

  /** @deprecated Use padY="none" */
  noPadding?: boolean;
};

const PageContainer = React.forwardRef<HTMLElement, PageContainerProps>(
  (
    {
      className,
      centerChildren = false,
      padY = "lg",
      noPadding,
      ...props
    },
    ref
  ) => {
    const pad = noPadding ? "none" : padY;

    return (
      <main
        ref={ref}
        role="main"
        className={cn(
          // keep your global background hook
          "page-container w-full min-h-[100dvh] flex flex-col",
          // your master text hue (optional but consistent with your manifesto)
          "text-eb-text",
          centerChildren && "items-center justify-center",
          padYMap[pad],
          className
        )}
        {...props}
      />
    );
  }
);

PageContainer.displayName = "PageContainer";
export default PageContainer;
