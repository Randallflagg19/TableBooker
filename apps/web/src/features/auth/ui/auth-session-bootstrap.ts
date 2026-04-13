'use client';

import { useEffect } from 'react';

import { refreshAccessToken } from '@/features/auth/lib/auth-session';
import { getAccessToken } from '@/features/auth/lib/token-storage';

export default function AuthSessionBootstrap() {
  useEffect(() => {
    const bootstrapSession = async () => {
      const accessToken = getAccessToken();

      if (accessToken) {
        return;
      }

      await refreshAccessToken();
    };

    void bootstrapSession();
  }, []);

  return null;
}
