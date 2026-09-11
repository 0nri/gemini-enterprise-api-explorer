interface StatusBannerProps {
  success: boolean;
}

/** ✓/✗ success indicator banner, matching the convention used across all API Explorer sections. */
export function StatusBanner({ success }: StatusBannerProps) {
  return (
    <div
      className={`mb-4 p-3 rounded ${
        success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}
    >
      {success ? '✓ Success' : '✗ Failed'}
    </div>
  );
}
