import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePresence() {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        let channel: any;

        const initPresence = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const userId = session.user.id;

            // Fetch current user details to broadcast
            const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', userId).single();

            // Ensure no existing channel with the same topic exists due to React Strict Mode
            const existingChannel = supabase.getChannels().find(c => c.topic.includes('online-users'));
            if (existingChannel) {
                await supabase.removeChannel(existingChannel);
            }

            channel = supabase.channel('online-users', {
                config: {
                    presence: {
                        key: userId,
                    },
                },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState();
                    const users: any[] = [];
                    for (const id in newState) {
                        const presenceData = newState[id][0] as any;
                        if (presenceData) {
                            users.push({
                                id,
                                full_name: presenceData.full_name,
                                role: presenceData.role,
                                online_at: presenceData.online_at
                            });
                        }
                    }
                    setOnlineUsers(users);
                    setOnlineCount(users.length);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({
                            user_id: userId,
                            full_name: profile?.full_name || 'مستخدم',
                            role: profile?.role || 'staff',
                            online_at: new Date().toISOString(),
                        });
                    }
                });
        };

        initPresence();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    return { onlineUsers, onlineCount };
}
