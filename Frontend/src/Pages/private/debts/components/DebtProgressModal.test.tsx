import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  DebtEditorRowDto,
  DebtRowProgressDto,
} from "@/types/budget/DebtEditorDto";
import DebtProgressModal from "./DebtProgressModal";
import { emptyPaymentBreakdown } from "../__fixtures__/paymentBreakdown";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const progress = (overrides: Partial<DebtRowProgressDto> = {}): DebtRowProgressDto => ({
  currentBalance: 38500,
  firstBalance: 60000,
  totalPaidDelta: 21500,
  percentPaid: 35.83,
  eventCount: 3,
  firstEventAt: "2026-01-15T09:00:00Z",
  lastEventAt: "2026-05-10T09:00:00Z",
  ...overrides,
});

const row = (overrides: Partial<DebtEditorRowDto> = {}): DebtEditorRowDto => ({
  id: "11111111-1111-4111-8111-111111111111",
  sourceDebtId: "22222222-2222-4222-8222-222222222222",
  name: "Privatlån",
  type: "bank_loan",
  balance: 38500,
  sourceBalance: 38500,
  apr: 6.4,
  sourceApr: 6.4,
  monthlyFee: null,
  sourceMonthlyFee: null,
  minPayment: 1100,
  sourceMinPayment: 1100,
  termMonths: 28,
  sourceTermMonths: 28,
  monthlyPayment: 1500,
  sourceMonthlyPayment: 1200,
  sourceLifecycleStatus: "active",
  participationStatus: "included",
  isMonthOnly: false,
  isRemoved: false,
  sortOrder: 1,
  group: "active",
  progress: progress(),
  paymentBreakdown: emptyPaymentBreakdown,
  actions: {
    canEditPayment: true,
    canEditDetails: true,
    canUpdateBalance: true,
    canSkipThisMonth: true,
    canIncludeThisMonth: false,
    canMarkPaidOff: true,
    canArchive: true,
    canRestore: false,
    canRemove: false,
    canUpdatePlan: true,
  },
  disabledReasons: [],
  ...overrides,
});

describe("DebtProgressModal", () => {
  it("renders percent, paid, and remaining strictly from the read-model progress data", () => {
    render(<DebtProgressModal open row={row()} onClose={vi.fn()} />);

    // 35.83 rounds to 36 for display; the bar width clamps to the same value.
    expect(screen.getByTestId("debt-progress-percent")).toHaveTextContent("36%");
    expect(screen.getByTestId("debt-progress-fill")).toHaveStyle({ width: "36%" });
    const delta = screen.getByTestId("debt-progress-delta");
    expect(delta).toHaveTextContent(/21[,\s]?500/);
    expect(delta).toHaveAttribute("data-direction", "reduced");
    expect(screen.getByTestId("debt-progress-remaining")).toHaveTextContent(
      /38[,\s]?500/,
    );
    // "of {original}" carries the first recorded balance.
    expect(screen.getByTestId("debt-progress-body")).toHaveTextContent(
      /60[,\s]?000/,
    );
    // The events note reports the real recorded count, never a fabricated one.
    expect(screen.getByTestId("debt-progress-events-note")).toHaveTextContent(
      /3 recorded balance changes/i,
    );
  });

  it("renders a negative paid delta as an honest 'balance increased' figure, not a green 'paid' amount", () => {
    render(
      <DebtProgressModal
        open
        row={row({
          progress: progress({
            // Balance grew (interest / upward correction): firstBalance below
            // currentBalance, so totalPaidDelta is negative and percentPaid < 0.
            firstBalance: 60000,
            currentBalance: 60500,
            totalPaidDelta: -500,
            percentPaid: -0.83,
          }),
        })}
        onClose={vi.fn()}
      />,
    );

    const delta = screen.getByTestId("debt-progress-delta");
    expect(delta).toHaveAttribute("data-direction", "increased");
    // Absolute value shown; never a misleading negative "paid" figure.
    expect(delta).toHaveTextContent(/500/);
    // The "Paid" framing must be gone — it reads as a balance increase.
    expect(screen.getByTestId("debt-progress-body")).toHaveTextContent(
      /Balance increased/i,
    );
    // A negative percent clamps to an empty bar (0%), never a negative width.
    expect(screen.getByTestId("debt-progress-percent")).toHaveTextContent("0%");
    expect(screen.getByTestId("debt-progress-fill")).toHaveStyle({ width: "0%" });
  });

  it("shows a no-percentage note instead of a bar when the first recorded balance was zero", () => {
    render(
      <DebtProgressModal
        open
        row={row({ progress: progress({ percentPaid: null, firstBalance: 0 }) })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("debt-progress-percent")).not.toBeInTheDocument();
    expect(screen.queryByTestId("debt-progress-fill")).not.toBeInTheDocument();
    expect(screen.getByTestId("debt-progress-body")).toHaveTextContent(
      /no percentage can be shown/i,
    );
  });

  it("renders the honest no-history fallback when the row has no progress data", () => {
    render(
      <DebtProgressModal open row={row({ progress: null })} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("debt-progress-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("debt-progress-body")).not.toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <DebtProgressModal open={false} row={row()} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
