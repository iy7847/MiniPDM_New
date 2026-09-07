import { useState, useEffect, useCallback } from 'react';
import { clientDetailService, type ClientOrderItemPrice } from '../services/clientDetailService';
import type { Client } from '@/shared/types/client';

export function useClientDetail(clientId?: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<ClientOrderItemPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClientData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const [clientData, ordersData, estimatesData, pricesData] = await Promise.all([
        clientDetailService.getClientById(clientId),
        clientDetailService.getClientOrders(clientId),
        clientDetailService.getClientEstimates(clientId),
        clientDetailService.getClientPartPrices(clientId),
      ]);

      setClient(clientData);
      setOrders(ordersData);
      setEstimates(estimatesData);
      setPriceHistory(pricesData);
    } catch (err) {
      console.error('Failed to load client detail data:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  return {
    client,
    orders,
    estimates,
    priceHistory,
    loading,
    reload: loadClientData,
  };
}
