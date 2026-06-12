import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorSelectedMonth } from "./useEditorSelectedMonth";

const mockUseBudgetMonthsStatusQuery = vi.fn();

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

function monthsStatus() {
  return {
    data: {
      openMonthYearMonth: "2026-05",
      currentYearMonth: "2026-05",
      gapMonthsCount: 0,
      months: [
        {
          yearMonth: "2026-06",
          status: "planned" as const,
          openedAt: "2026-05-10T00:00:00Z",
          closedAt: null,
        },
        {
          yearMonth: "2026-05",
          status: "open" as const,
          openedAt: "2026-05-01T00:00:00Z",
          closedAt: null,
        },
        {
          yearMonth: "2026-04",
          status: "closed" as const,
          openedAt: "2026-04-01T00:00:00Z",
          closedAt: "2026-04-30T00:00:00Z",
        },
        {
          yearMonth: "2026-03",
          status: "skipped" as const,
          openedAt: "2026-03-01T00:00:00Z",
          closedAt: "2026-03-01T00:00:00Z",
        },
      ],
      suggestedAction: "none" as const,
    },
    isLoading: false,
    isError: false,
  };
}

function wrapperFor(url: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseBudgetMonthsStatusQuery.mockReturnValue(monthsStatus());
});

describe("useEditorSelectedMonth", () => {
  it("defaults to the open month when no yearMonth param is present", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income"),
    });

    expect(result.current.yearMonth).toBe("2026-05");
    expect(result.current.status).toBe("open");
    expect(result.current.isExplicitSelection).toBe(false);
    expect(result.current.isInvalidSelection).toBe(false);
    expect(result.current.isEditable).toBe(true);
    expect(result.current.isOffOpenMonth).toBe(false);
  });

  it("targets a planned month and keeps it editable", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=2026-06"),
    });

    expect(result.current.yearMonth).toBe("2026-06");
    expect(result.current.status).toBe("planned");
    expect(result.current.isExplicitSelection).toBe(true);
    expect(result.current.isEditable).toBe(true);
    expect(result.current.isOffOpenMonth).toBe(true);
  });

  it("targets a closed month as read-only", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=2026-04"),
    });

    expect(result.current.yearMonth).toBe("2026-04");
    expect(result.current.status).toBe("closed");
    expect(result.current.isEditable).toBe(false);
    expect(result.current.isInvalidSelection).toBe(false);
  });

  it("targets a skipped month as read-only", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=2026-03"),
    });

    expect(result.current.status).toBe("skipped");
    expect(result.current.isEditable).toBe(false);
  });

  it("reports an unknown month as invalid instead of falling back to the open month", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=2099-01"),
    });

    expect(result.current.yearMonth).toBeNull();
    expect(result.current.isInvalidSelection).toBe(true);
    expect(result.current.isEditable).toBe(false);
  });

  it("reports a malformed yearMonth as invalid", () => {
    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=not-a-month"),
    });

    expect(result.current.yearMonth).toBeNull();
    expect(result.current.isInvalidSelection).toBe(true);
  });

  it("exposes loading while month status is unresolved", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { result } = renderHook(() => useEditorSelectedMonth(), {
      wrapper: wrapperFor("/dashboard/income?yearMonth=2026-06"),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.yearMonth).toBeNull();
    expect(result.current.isInvalidSelection).toBe(false);
  });
});
