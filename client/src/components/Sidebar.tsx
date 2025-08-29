import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeaderboardEntry } from "@/lib/types";

interface SidebarProps {
  onSubmitClick: () => void;
}

export default function Sidebar({ onSubmitClick }: SidebarProps) {
  const [activeLeaderboard, setActiveLeaderboard] = useState('love');
  const [newActionName, setNewActionName] = useState('');
  const { toast } = useToast();

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/leaderboard', { action: activeLeaderboard }],
  });

  const actionSuggestionMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest('POST', '/api/actions', { name: name.toLowerCase() });
    },
    onSuccess: () => {
      toast({
        title: "Action suggested!",
        description: "Your action suggestion has been submitted for review.",
      });
      setNewActionName('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes('Rate limit')
          ? "Please wait before suggesting another action"
          : "Failed to suggest action",
        variant: "destructive",
      });
    },
  });

  const handleActionSuggestion = () => {
    if (!newActionName.trim()) return;
    actionSuggestionMutation.mutate(newActionName.trim());
  };

  return (
    <div className="lg:col-span-1">
      {/* Submit New Post Widget */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Submit New Post</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Share your favorite celebrity, character, or politician for others to vote on!
          </p>
          <Button
            className="w-full"
            onClick={onSubmitClick}
            data-testid="button-sidebar-submit"
          >
            <i className="fas fa-plus mr-2"></i>
            Create Post
          </Button>
        </CardContent>
      </Card>

      {/* Top Leaderboard */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">🏆 Top Leaderboard</h3>
          
          {/* Leaderboard Tabs */}
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {['love', 'slap', 'hate'].map((action) => (
              <button
                key={action}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                  activeLeaderboard === action
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                }`}
                onClick={() => setActiveLeaderboard(action)}
                data-testid={`button-leaderboard-${action}`}
              >
                Most {action}d
              </button>
            ))}
          </div>
          
          {/* Leaderboard List */}
          <div className="space-y-3">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <div key={entry.post.id} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-accent'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" data-testid={`text-leaderboard-name-${entry.post.id}`}>
                    {entry.post.name}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {entry.post.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary" data-testid={`text-leaderboard-votes-${entry.post.id}`}>
                    {entry.voteCount >= 1000 ? `${(entry.voteCount / 1000).toFixed(1)}k` : entry.voteCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeLeaderboard === 'love' ? '❤️ loves' : 
                     activeLeaderboard === 'slap' ? '✋ slaps' : '👎 hates'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <a href="#leaderboard" className="text-primary hover:text-primary/80 text-sm font-medium">
              View Full Leaderboard →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Custom Action Suggestion */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">💡 Suggest Action</h3>
          <p className="text-muted-foreground text-sm mb-4">Have an idea for a new voting action? Suggest it!</p>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Action name (e.g., 'applaud')"
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
              data-testid="input-action-suggestion"
            />
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleActionSuggestion}
              disabled={actionSuggestionMutation.isPending || !newActionName.trim()}
              data-testid="button-suggest-action"
            >
              <i className="fas fa-lightbulb mr-2"></i>
              {actionSuggestionMutation.isPending ? 'Suggesting...' : 'Suggest Action'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">📊 Recent Activity</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <i className="fas fa-heart text-red-500"></i>
              <span className="text-muted-foreground">Live voting happening now!</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-users text-blue-500"></i>
              <span className="text-muted-foreground">Join the community</span>
            </div>
            <div className="flex items-center space-x-2">
              <i className="fas fa-fire text-orange-500"></i>
              <span className="text-muted-foreground">Check trending posts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
