import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30000, // 30 seconds before data is considered stale
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Unauthorized');
      }
      return response.json();
    }
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
  };
}
