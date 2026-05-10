import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePatchBudgetMonthExpenseItemsBulk } from "./useMonthEditor";

const mockBulkApi = vi.fn();

vi.mock("@/api/Services/Budget/editor/monthEditor.api", () => ({
  patchBudgetMonthExpenseItemsBulk: (...args: unknown[]) => mockBulkApi(...args),
  patchBudgetMonthExpenseItem: vi.fn(),
  createBudgetMonthExpenseItem: vi.fn(),
  deleteBudgetMonthExpenseItem: vi.fn(),
  getBudgetMonthEditor: vi.fn(),
}));

function buildWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return Wrapper;
}

describe("usePatchBudgetMonthExpenseItemsBulk", () => {
  beforeEach(() => {
    mockBulkApi.mockReset();
  });

  it("flattens legacy rows and invokes the bulk endpoint exactly once", async () => {
    mockBulkApi.mockResolvedValue([{ id: "row-1" }]);

    const wrapper = buildWrapper();
    const { result } = renderHook(
      () => usePatchBudgetMonthExpenseItemsBulk("2026-04"),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync([
        {
          monthExpenseItemId: "row-1",
          payload: {
            name: "Netflix",
            categoryId: "9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4",
            amountMonthly: 129,
            isActive: true,
            subscriptionLifecycleStatus: "paused",
            updateDefault: true,
          },
        },
        {
          monthExpenseItemId: "row-2",
          payload: {
            name: "Groceries",
            categoryId: "5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10",
            amountMonthly: 312.5,
            isActive: true,
            subscriptionLifecycleStatus: null,
            updateDefault: false,
          },
        },
      ]);
    });

    await waitFor(() => {
      expect(mockBulkApi).toHaveBeenCalledTimes(1);
    });

    expect(mockBulkApi).toHaveBeenCalledWith("2026-04", [
      {
        monthExpenseItemId: "row-1",
        name: "Netflix",
        categoryId: "9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4",
        amountMonthly: 129,
        isActive: true,
        subscriptionLifecycleStatus: "paused",
        updateDefault: true,
      },
      {
        monthExpenseItemId: "row-2",
        name: "Groceries",
        categoryId: "5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10",
        amountMonthly: 312.5,
        isActive: true,
        subscriptionLifecycleStatus: null,
        updateDefault: false,
      },
    ]);
  });
});
