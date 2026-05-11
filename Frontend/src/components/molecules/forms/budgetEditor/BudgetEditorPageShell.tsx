import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";
import type { ReactNode } from "react";

type BudgetEditorPageShellProps = {
  children: ReactNode;
};

export default function BudgetEditorPageShell({
  children,
}: BudgetEditorPageShellProps) {
  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.40)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.26)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.26)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-6 pb-10 sm:pt-8 sm:pb-12"
      >
        {children}
      </ContentWrapperV2>
    </PageContainer>
  );
}
