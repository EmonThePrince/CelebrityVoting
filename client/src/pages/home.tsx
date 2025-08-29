import { useState } from "react";
import Header from "@/components/Header";
import CategoryFilter from "@/components/CategoryFilter";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import SubmissionModal from "@/components/SubmissionModal";
import { useQuery } from "@tanstack/react-query";
import type { PostWithVotes } from "@/lib/types";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const { data: posts = [], isLoading, refetch } = useQuery<PostWithVotes[]>({
    queryKey: ['/api/posts', { 
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      sort: sortBy 
    }],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || post.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handlePostSubmitted = () => {
    setIsSubmissionModalOpen(false);
    refetch();
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSubmitClick={() => setIsSubmissionModalOpen(true)}
      />
      
      <CategoryFilter 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        stats={stats}
      />

      {/* Trending Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-secondary to-primary rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">🔥 Trending Now</h2>
                <p className="text-white/90">Most voted celebrities in the last 24 hours</p>
              </div>
              <div className="hidden sm:block">
                <div className="text-right">
                  <div className="text-3xl font-bold" data-testid="text-trending-count">
                    {stats?.totalVotes || 0}
                  </div>
                  <div className="text-sm text-white/80">Total votes today</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Sort Options */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Celebrity Posts</h3>
              <div className="flex items-center space-x-4">
                <select 
                  className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  data-testid="select-sort"
                >
                  <option value="recent">Most Recent</option>
                  <option value="votes">Most Voted</option>
                  <option value="trending">Trending</option>
                </select>
              </div>
            </div>

            {/* Posts Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} onVoteSuccess={refetch} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg mb-4">No posts found</div>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search terms' : 'Be the first to submit a post!'}
                </p>
              </div>
            )}

            {/* Load More Button */}
            {filteredPosts.length > 0 && (
              <div className="text-center">
                <button 
                  className="bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-lg font-medium transition-colors"
                  data-testid="button-load-more"
                >
                  Load More Posts
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <Sidebar onSubmitClick={() => setIsSubmissionModalOpen(true)} />
        </div>
      </div>

      {/* Submission Modal */}
      <SubmissionModal 
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSubmitted={handlePostSubmitted}
      />

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">🎭 CelebVote</h3>
              <p className="text-muted-foreground text-sm">Vote on your favorite celebrities, fictional characters, and politicians. Express your feelings with fun interactive actions!</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <a href="#home" className="block text-muted-foreground hover:text-primary transition-colors">Home</a>
                <a href="#trending" className="block text-muted-foreground hover:text-primary transition-colors">Trending</a>
                <a href="#leaderboard" className="block text-muted-foreground hover:text-primary transition-colors">Leaderboard</a>
                <a href="#submit" className="block text-muted-foreground hover:text-primary transition-colors">Submit Post</a>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Community</h4>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Total Posts: <span className="font-bold text-primary" data-testid="text-total-posts">{stats?.totalPosts || 0}</span>
                </p>
                <p className="text-muted-foreground">
                  Total Votes: <span className="font-bold text-primary" data-testid="text-total-votes">{stats?.totalVotes || 0}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-muted-foreground text-sm">&copy; 2024 CelebVote. All rights reserved. | Anonymous voting platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
