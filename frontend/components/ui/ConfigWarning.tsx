interface ConfigWarningProps {
  feature: string;
}

/** "Configuration Required" banner shown when Project Number / Engine ID aren't set. */
export function ConfigWarning({ feature }: ConfigWarningProps) {
  return (
    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-amber-800 font-medium text-sm">⚠️ Configuration Required</p>
      <p className="text-amber-700 text-xs mt-1">
        Please configure your Project Number and Engine ID in the sidebar to use {feature}.
      </p>
    </div>
  );
}
