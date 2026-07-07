import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useSubcontractorsLogic() {
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select(`
          id,
          code,
          name,
          phone,
          job_role,
          partner_type
        `)
        .eq('partner_type', 'مقاول')
        .order('id', { ascending: false });

      if (error) throw error;
      setSubcontractors(data || []);
    } catch (err) {
      console.error('Error fetching subcontractors:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubcontractors();
  };

  return {
    subcontractors,
    loading,
    refreshing,
    onRefresh
  };
}
