interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Centered placeholder for "no data yet" / "nothing found" panels. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-sm italic">{title}</p>
      {description && <p className="text-xs mt-1">{description}</p>}
    </div>
  );
}
