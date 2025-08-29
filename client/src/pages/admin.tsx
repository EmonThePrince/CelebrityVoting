import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Post, ActionType, AdminStats } from "@/lib/types";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: pendingPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts/pending"],
    enabled: isAuthenticated && activeTab === 'posts',
  });

  const { data: pendingActions = [] } = useQuery<ActionType[]>({
    queryKey: ["/api/admin/actions/pending"],
    enabled: isAuthenticated && activeTab === 'actions',
  });

  const approvePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('PATCH', `/api/admin/posts/${postId}`, { status: 'approved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post approved successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve post",
        variant: "destructive",
      });
    },
  });

  const rejectPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('PATCH', `/api/admin/posts/${postId}`, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post rejected successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject post",
        variant: "destructive",
      });
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await apiRequest('PATCH', `/api/admin/actions/${actionId}`, { approved: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Action approved successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve action",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">🛡️ CelebVote Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.firstName || 'Admin'}
              </span>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
              <Button
                variant="destructive"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Posts</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-pending-posts">
                    {adminStats?.pendingPosts || 0}
                  </p>
                </div>
                <i className="fas fa-clock text-2xl text-secondary"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Posts</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-admin-total-posts">
                    {adminStats?.totalPosts || 0}
                  </p>
                </div>
                <i className="fas fa-star text-2xl text-primary"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Votes</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-admin-total-votes">
                    {adminStats?.totalVotes || 0}
                  </p>
                </div>
                <i className="fas fa-vote-yea text-2xl text-accent"></i>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Actions</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-pending-actions">
                    {adminStats?.pendingActions || 0}
                  </p>
                </div>
                <i className="fas fa-lightbulb text-2xl text-secondary"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Card>
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              <button 
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('posts')}
                data-testid="tab-pending-posts"
              >
                Pending Posts ({adminStats?.pendingPosts || 0})
              </button>
              <button 
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'actions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('actions')}
                data-testid="tab-custom-actions"
              >
                Custom Actions ({adminStats?.pendingActions || 0})
              </button>
            </nav>
          </div>

          <CardContent className="p-6">
            {activeTab === 'posts' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Posts Awaiting Approval</h3>
                </div>

                {pendingPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending posts to review
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPosts.map((post) => (
                      <div key={post.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start space-x-4">
                          <img 
                            src={post.imageUrl} 
                            alt={post.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            data-testid={`img-pending-post-${post.id}`}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground" data-testid={`text-post-name-${post.id}`}>
                              {post.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Category: <span className="font-medium capitalize">{post.category}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => approvePostMutation.mutate(post.id)}
                              disabled={approvePostMutation.isPending}
                              data-testid={`button-approve-post-${post.id}`}
                            >
                              <i className="fas fa-check mr-1"></i>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectPostMutation.mutate(post.id)}
                              disabled={rejectPostMutation.isPending}
                              data-testid={`button-reject-post-${post.id}`}
                            >
                              <i className="fas fa-times mr-1"></i>
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Custom Action Suggestions</h3>
                </div>

                {pendingActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending action suggestions to review
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingActions.map((action) => (
                      <div key={action.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground capitalize" data-testid={`text-action-name-${action.id}`}>
                              {action.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Suggested {new Date(action.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                              onClick={() => approveActionMutation.mutate(action.id)}
                              disabled={approveActionMutation.isPending}
                              data-testid={`button-approve-action-${action.id}`}
                            >
                              <i className="fas fa-check mr-1"></i>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => approveActionMutation.mutate(action.id)}
                              disabled={approveActionMutation.isPending}
                              data-testid={`button-reject-action-${action.id}`}
                            >
                              <i className="fas fa-times mr-1"></i>
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
