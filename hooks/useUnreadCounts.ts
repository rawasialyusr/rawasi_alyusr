import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadCounts() {
    const [counts, setCounts] = useState({ unread_messages: 0, unread_notifications: 0 });

    useEffect(() => {
        const fetchCounts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('vw_unread_counts')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
            
            if (data && !error) {
                setCounts({
                    unread_messages: Number(data.unread_messages || 0),
                    unread_notifications: Number(data.unread_notifications || 0)
                });
            }
        };

        fetchCounts();

        // Optional: you can add an interval or realtime subscription to refresh it
        const interval = setInterval(fetchCounts, 60000); // refresh every minute

        return () => clearInterval(interval);
    }, []);

    return counts;
}
