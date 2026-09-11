'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api';

interface AuthStatusSuccess {
  success: true;
  credential_type: string;
  credential_label: string;
  principal: string | null;
  adc_project: string | null;
  valid: boolean;
}

interface AuthStatusFailure {
  success: false;
  error: {
    type: string;
    message: string;
  };
}

type AuthStatus = AuthStatusSuccess | AuthStatusFailure;

const CREDENTIAL_ICONS: Record<string, string> = {
  workforce_identity_federation: '🔐',
  workload_identity_federation: '🔐',
  service_account: '🔑',
  authorized_user: '👤',
  compute_engine: '💻',
  impersonated: '🎭',
  unknown: '❓',
};

export default function AuthStatusBadge() {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api-explorer/auth-status`);
        const data = await res.json();
        if (!cancelled) {
          setStatus(data);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({
            success: false,
            error: {
              type: e instanceof Error ? e.name : 'Error',
              message: e instanceof Error ? e.message : String(e),
            },
          });
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === null) {
    return (
      <p className="text-xs text-gray-500">Checking backend authentication...</p>
    );
  }

  if (!status.success) {
    return (
      <div
        className="p-2 bg-amber-50 border border-amber-200 rounded-lg shadow-sm"
        title={status.error.message}
      >
        <p className="text-xs text-amber-800">⚠ Backend has no usable credentials</p>
      </div>
    );
  }

  const icon = CREDENTIAL_ICONS[status.credential_type] || CREDENTIAL_ICONS.unknown;

  return (
    <div className="p-2 bg-green-50 border border-green-200 rounded-lg shadow-sm">
      <p className="text-xs text-green-800">
        {icon} {status.credential_label}
      </p>
      {status.principal !== null && (
        <p className="mt-0.5 text-xs text-green-700 break-all">
          Account: {status.principal}
        </p>
      )}
      {status.adc_project !== null && (
        <p className="mt-0.5 text-xs text-green-700">
          Quota project: {status.adc_project}
        </p>
      )}
    </div>
  );
}
