import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { Language, Profile } from '@/types/database';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: user ? queryKeys.profile(user.id) : ['profile', 'anonymous'],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, preferred_language')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateLanguage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (language: Language) => {
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    },
  });
}
