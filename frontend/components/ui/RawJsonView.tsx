interface RawJsonViewProps {
  data: unknown;
  label?: string;
}

/**
 * Collapsed-by-default raw JSON inspector. Every friendly result view should
 * pair with one of these so the underlying API payload stays inspectable
 * without dominating the page.
 */
export function RawJsonView({ data, label = 'View raw JSON' }: RawJsonViewProps) {
  if (data === undefined || data === null) return null;

  return (
    <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
        {label}
      </summary>
      <pre className="mt-4 p-4 bg-white rounded border border-gray-200 overflow-x-auto text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
