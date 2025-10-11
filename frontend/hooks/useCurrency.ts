// hooks/useCurrency.ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export interface Currency {
  code: string;
  symbol: string;
}

const defaultCurrency: Currency = { code: 'USD', symbol: '$' };

export function useCurrency(businessId: number | string) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchBusinessCurrency = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const business = await apiClient.getBusiness(Number(businessId));
        
        if (business.currency_code && business.currency_symbol) {
          setCurrency({
            code: business.currency_code,
            symbol: business.currency_symbol
          });
        } else {
          setCurrency(defaultCurrency);
        }
      } catch (err) {
        console.error('Failed to fetch business currency:', err);
        setError('Failed to load currency settings');
        setCurrency(defaultCurrency); // Fallback to USD
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessCurrency();
  }, [businessId]);

  const formatCurrency = (amount: number): string => {
    return `${currency.symbol}${amount.toFixed(2)}`;
  };

  const updateCurrency = async (newCurrency: Currency) => {
    try {
      await apiClient.updateBusinessCurrency(
        Number(businessId), 
        newCurrency.code, 
        newCurrency.symbol
      );
      setCurrency(newCurrency);
      return true;
    } catch (err) {
      console.error('Failed to update currency:', err);
      setError('Failed to update currency settings');
      return false;
    }
  };

  return {
    currency,
    formatCurrency,
    updateCurrency,
    isLoading,
    error
  };
}

// Common currencies for selection
export const COMMON_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CHF', symbol: 'CHF' },
  { code: 'CNY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'SEK', symbol: 'kr' },
  { code: 'NOK', symbol: 'kr' },
  { code: 'DKK', symbol: 'kr' },
];