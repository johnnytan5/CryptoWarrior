'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount, useDisconnectWallet } from '@onelabs/dapp-kit';
import { useApp } from '@/context/AppContext';

export default function Navbar() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const { battleTokenBalance, isLoadingBalance } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: '/', label: 'Battle' },
    { href: '/mint', label: 'Mint' },
    { href: '/profile', label: 'Profile' },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
    router.push('/connect-wallet');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <nav className="glass-effect border-b border-white/5 shadow-lg relative z-50 sticky top-0">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-12">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/" className="text-xl font-semibold text-neon-cyan tracking-wide">
                Crypto Battle Arena
              </Link>
            </motion.div>
            {currentAccount && (
              <div className="flex space-x-1">
                {navLinks.map((link, index) => {
                  const isActive = pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabBorder"
                          className="absolute inset-0 bg-neon-cyan/5 rounded-lg"
                          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                      )}
                      <Link
                        href={link.href}
                        className={`relative block px-4 py-2 rounded-lg text-sm font-medium tracking-wide transition-all ${
                          isActive
                            ? 'text-neon-cyan'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
          {currentAccount && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4 relative"
              ref={dropdownRef}
            >
              {/* Battle Token Balance */}
              <motion.div 
                className="flex items-center space-x-2 bg-neon-cyan/5 border border-neon-cyan/20 rounded-lg px-3 py-2"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-2 h-2 bg-neon-cyan rounded-full"></div>
                <div className="text-xs">
                  <div className="text-gray-400 text-[10px] tracking-wide">Battle Tokens</div>
                  <div className="text-neon-cyan font-semibold font-mono">
                    {isLoadingBalance ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      `${battleTokenBalance.toFixed(2)} BTK`
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Wallet Address */}
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-neon-green rounded-full"
                />
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-xs font-mono text-gray-300 bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  {formatAddress(currentAccount.address)}
                </button>
              </div>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-44 glass-effect border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-1">
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}
