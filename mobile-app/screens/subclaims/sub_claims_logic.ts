import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useSubClaimsLogic() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('sub_claims')
        .select(`
          id,
          claim_number,
          status,
          net_amount,
          projects(Property),
          partners(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClaims();
  };

  return {
    claims,
    loading,
    refreshing,
    onRefresh
  };
}
