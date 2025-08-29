export interface PostWithVotes {
  id: string;
  name: string;
  category: 'film' | 'fictional' | 'political';
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  votes: Record<string, number>;
  totalVotes: number;
}

export interface LeaderboardEntry {
  post: {
    id: string;
    name: string;
    category: 'film' | 'fictional' | 'political';
    imageUrl: string;
  };
  voteCount: number;
}

export interface ActionType {
  id: string;
  name: string;
  approved: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalPosts: number;
  totalVotes: number;
  pendingPosts: number;
  pendingActions: number;
}
