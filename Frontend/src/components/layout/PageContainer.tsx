import { cn } from "@/lib/utils";
import * as React from "react";

type PadY = "none" | "sm" | "md" | "lg";

const padYMap: Record<PadY, string> = {
  none: "py-0",
  sm: "py-6 sm:py-10",
  md: "py-10 sm:py-16",
  lg: "py-10 sm:py-20",
};

export type PageContainerProps = React.ComponentPropsWithoutRef<"main"> & {
  centerChildren?: boolean;
  padY?: PadY;
  noPadding?: boolean;

  /** Ensures the scroll/backdrop surface always has the app gradient */
  withBackground?: boolean;
};

const PageContainer = React.forwardRef<HTMLElement, PageContainerProps>(
  (
    {
      className,
      centerChildren = false,
      padY = "lg",
      noPadding,
      withBackground = true,
      ...props
    },
    ref,
  ) => {
    const pad = noPadding ? "none" : padY;

    return (
      <main
        ref={ref}
        role="main"
        className={cn(
          "page-container w-full min-h-[100dvh] flex flex-col",
          "text-eb-text",
          withBackground &&
            "bg-gradient-to-br from-customBlue1 to-customBlue2 bg-cover",

          // IMPORTANT: do NOT put overflow scrolling here for blur pages
          // Let the document scroll.
          // If some page *must* scroll internally, it should opt-in explicitly.

          centerChildren && "items-center justify-center",
          padYMap[pad],
          className,
        )}
        {...props}
      />
    );
  },
);

PageContainer.displayName = "PageContainer";
export default PageContainer;
