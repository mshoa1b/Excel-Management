// components/business/CurrencySettings.tsx
'use client';

import { useState } from 'react';
import { useCurrency, COMMON_CURRENCIES, Currency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, DollarSign } from 'lucide-react';

interface CurrencySettingsProps {
  businessId: number | string;
}

export default function CurrencySettings({ businessId }: CurrencySettingsProps) {
  const { currency, updateCurrency, isLoading, error } = useCurrency(businessId);
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [customSymbol, setCustomSymbol] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCurrencyChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setSelectedCurrency({ code: '', symbol: '' });
    } else {
      const selected = COMMON_CURRENCIES.find(c => c.code === value);
      if (selected) {
        setIsCustom(false);
        setSelectedCurrency(selected);
        setCustomSymbol('');
      }
    }
  };

  const handleSave = async () => {
    if (!selectedCurrency.code || !selectedCurrency.symbol) {
      toast({
        title: "Validation Error",
        description: "Please select a currency and symbol",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const currencyToSave = isCustom 
        ? { code: selectedCurrency.code, symbol: customSymbol }
        : selectedCurrency;

      const success = await updateCurrency(currencyToSave);
      
      if (success) {
        toast({
          title: "Currency Updated",
          description: `Currency set to ${currencyToSave.code} (${currencyToSave.symbol})`,
        });
      }
    } catch (err) {
      toast({
        title: "Update Failed",
        description: "Failed to update currency settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Currency Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading currency settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Currency Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="current-currency">Current Currency</Label>
            <div className="flex items-center space-x-2 mt-1 p-2 bg-gray-50 rounded">
              <span className="font-semibold">{currency.code}</span>
              <span>({currency.symbol})</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="currency-select">Select New Currency</Label>
            <Select onValueChange={handleCurrencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose currency..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol})
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Currency...</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custom-code">Currency Code</Label>
              <Input
                id="custom-code"
                placeholder="e.g., USD, EUR, GBP"
                maxLength={3}
                value={selectedCurrency.code}
                onChange={(e) => setSelectedCurrency({
                  ...selectedCurrency,
                  code: e.target.value.toUpperCase()
                })}
              />
            </div>
            <div>
              <Label htmlFor="custom-symbol">Currency Symbol</Label>
              <Input
                id="custom-symbol"
                placeholder="e.g., $, €, £"
                maxLength={5}
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
              />
            </div>
          </div>
        )}

        {selectedCurrency.code && (
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm text-blue-700">
              <strong>Preview:</strong> {isCustom ? customSymbol : selectedCurrency.symbol}1,234.56
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !selectedCurrency.code || (isCustom && !customSymbol)}
          >
            {isSaving ? 'Saving...' : 'Update Currency'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}