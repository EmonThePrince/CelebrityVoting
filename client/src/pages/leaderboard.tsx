import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import type { PostWithVotes, ActionType } from "@/lib/types";

export default function Leaderboard() {
  const [selectedAction, setSelectedAction] = useState<string>('slap');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: actions = [] } = useQuery<ActionType[]>({
    queryKey: ['/api/actions'],
  });

  const { data: posts = [], isLoading } = useQuery<PostWithVotes[]>({
    queryKey: ['/api/posts', { 
      action: selectedAction,
      limit: 50
    }],
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || post.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSubmitClick={() => {}}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-secondary to-primary rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">🏆 Action Leaderboard</h1>
                <p className="text-white/90">See which celebrities are getting the most action votes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-4">
            {/* Action Filter */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Top Posts by Action</h2>
              <div className="flex items-center space-x-4">
                <select 
                  className="bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  data-testid="select-leaderboard-action"
                >
                  {actions.filter(action => action.approved).map((action) => (
                    <option key={action.id} value={action.name}>
                      Most {action.name.charAt(0).toUpperCase() + action.name.slice(1)}ed
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Posts Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                    <div className="h-64 bg-muted animate-pulse"></div>
                    <div className="p-6">
                      <div className="h-6 bg-muted rounded animate-pulse mb-2"></div>
                      <div className="h-4 bg-muted rounded animate-pulse mb-4"></div>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="h-16 bg-muted rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map((post, index) => (
                  <div key={post.id} className="relative">
                    {index < 3 && (
                      <div className={`absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        'bg-amber-700'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                    <PostCard post={post} onVoteSuccess={() => {}} />
                    <div className="text-center mt-2">
                      <span className="text-sm font-bold text-primary">
                        {post.votes[selectedAction] || 0} {selectedAction}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg mb-4">No posts found</div>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search terms' : 'No votes for this action yet!'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">&copy; 2024 CelebVote. All rights reserved. | Anonymous voting platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
