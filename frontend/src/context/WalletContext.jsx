import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [balance, setBalance] = useState('0.00');

  const fetchBalance = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await axios.get('http://127.0.0.1:8000/dashboard/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.wallet_balance !== undefined) {
        setBalance(res.data.wallet_balance.toFixed(2));
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
    }
  }, []);

  // Optionally fetch on mount if token exists
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <WalletContext.Provider value={{ balance, fetchBalance, setBalance }}>
      {children}
    </WalletContext.Provider>
  );
};
