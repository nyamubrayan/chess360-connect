import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useNearbyPlayersCount = (userId: string | undefined) => {
  const [count, setCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const fetchNearbyCount = async () => {
      try {
        // Get current user's location
        const { data: currentUser } = await supabase
          .from('profiles')
          .select('latitude, longitude, location_enabled')
          .eq('id', userId)
          .maybeSingle();

        if (!currentUser?.location_enabled || !currentUser.latitude || !currentUser.longitude) {
          setCount(0);
          return;
        }

        // Get all users with location enabled
        const { data: nearbyUsers, error } = await supabase
          .from('profiles')
          .select('id, latitude, longitude')
          .eq('location_enabled', true)
          .neq('id', userId);

        if (error) throw error;

        // Calculate nearby players (within 50km)
        const nearby = nearbyUsers?.filter(user => {
          if (!user.latitude || !user.longitude) return false;
          const distance = calculateDistance(
            Number(currentUser.latitude),
            Number(currentUser.longitude),
            Number(user.latitude),
            Number(user.longitude)
          );
          return distance <= 50;
        }) || [];

        setCount(nearby.length);
      } catch (error) {
        console.error('Error fetching nearby players count:', error);
      }
    };

    fetchNearbyCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchNearbyCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
};
