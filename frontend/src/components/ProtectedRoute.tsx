'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentAccount } from '@onelabs/dapp-kit';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const currentAccount = useCurrentAccount();
  const router = useRouter();

  useEffect(() => {
    if (!currentAccount) {
      router.push('/connect-wallet');
    }
  }, [currentAccount, router]);

  if (!currentAccount) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-3 text-neon-cyan font-sci-fi">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neon-cyan border-t-transparent"></div>
            <span className="tracking-wider">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

