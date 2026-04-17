type ExpenseEditorEmptyStateProps = {
  text: string;
};

export default function ExpenseEditorEmptyState({
  text,
}: ExpenseEditorEmptyStateProps) {
  return (
    <div className="border-t border-eb-stroke/20 px-4 py-6 text-sm text-eb-text/50">
      {text}
    </div>
  );
}
