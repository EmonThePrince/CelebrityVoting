import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { PostWithVotes as Post, ActionType, AdminStats } from "@/lib/types";

export default function Admin() {
   const { toast } = useToast();
   const { isAuthenticated, isLoading, user, isAdmin } = useAuth();
   const [activeTab, setActiveTab] = useState('pending-posts');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const queryClient = useQueryClient();

  // Data queries (always called to keep hook order stable)
  const { data: adminStats } = useQuery<AdminStats>({
    // Use public stats endpoint so counts are visible even if admin auth endpoints fail
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stats");
      return response.json();
    },
  });

  const { data: pendingPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts/pending", activeTab],
    enabled: isAuthenticated && activeTab === 'pending-posts',
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/posts/pending");
      return response.json();
    },
  });

  const { data: pendingActions = [] } = useQuery<ActionType[]>({
    queryKey: ["/api/admin/actions/pending", activeTab],
    enabled: isAuthenticated && activeTab === 'pending-actions',
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/actions/pending");
      return response.json();
    },
  });

  const { data: approvedPosts = [] } = useQuery<Post[]>({
    queryKey: ["/api/admin/posts/approved", activeTab],
    enabled: isAuthenticated && activeTab === 'approved-posts',
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/posts/approved");
      return response.json();
    },
  });

  const { data: approvedActions = [] } = useQuery<ActionType[]>({
    queryKey: ["/api/admin/actions/approved", activeTab],
    enabled: isAuthenticated && activeTab === 'approved-actions',
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/actions/approved");
      return response.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEmail('');
      setPassword('');
      window.location.href = '/admin';
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error?.message || 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: 'An error occurred while logging out.',
        variant: 'destructive',
      });
    }
  };

  // Authorization logic
  useEffect(() => {
    // If the user is authenticated but not an admin, redirect to home.
    if (!isLoading && isAuthenticated && !isAdmin) {
      window.location.href = '/';
    }
  }, [isLoading, isAuthenticated, isAdmin]);

  const approvePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('PATCH', `/api/admin/posts/${postId}`, { status: 'approved' });
    },
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/approved"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Post approved successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/admin"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to approve post", variant: "destructive" });
    },
  });

  const rejectPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('PATCH', `/api/admin/posts/${postId}`, { status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/approved"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Post rejected successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/admin"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to reject post", variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('DELETE', `/api/admin/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts/approved"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Post deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/admin"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await apiRequest('PATCH', `/api/admin/actions/${actionId}`, { approved: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions/approved"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Action approved successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/admin"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to approve action", variant: "destructive" });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      await apiRequest('DELETE', `/api/admin/actions/${actionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions/approved"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Action deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/admin"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete action", variant: "destructive" });
    },
  });

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show admin login page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Admin Login</h1>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="emon@gmail.com"
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="input-admin-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => loginMutation.mutate({ email, password })}
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
                Welcome, {(user as any)?.firstName || 'Admin'}
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
                onClick={async () => { await handleLogout(); window.location.href = '/'; }}
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
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'pending-posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('pending-posts')}
                data-testid="tab-pending-posts"
              >
                Pending Posts ({adminStats?.pendingPosts || 0})
              </button>
              <button 
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'approved-posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('approved-posts')}
                data-testid="tab-approved-posts"
              >
                Approved Posts ({((adminStats?.totalPosts || 0) - (adminStats?.pendingPosts || 0)) || 0})
              </button>
              <button 
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'pending-actions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('pending-actions')}
                data-testid="tab-pending-actions"
              >
                Pending Actions ({adminStats?.pendingActions || 0})
              </button>
              <button 
                className={`py-4 px-2 border-b-2 font-medium ${activeTab === 'approved-actions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('approved-actions')}
                data-testid="tab-approved-actions"
              >
                Approved Actions
              </button>
            </nav>
          </div>

          <CardContent className="p-6">
            {activeTab === 'pending-posts' && (
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

            {activeTab === 'approved-posts' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Approved Posts</h3>
                </div>

                {approvedPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No approved posts yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedPosts.map((post) => (
                      <div key={post.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start space-x-4">
                          <img 
                            src={post.imageUrl} 
                            alt={post.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            data-testid={`img-approved-post-${post.id}`}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground" data-testid={`text-approved-post-name-${post.id}`}>
                              {post.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Category: <span className="font-medium capitalize">{post.category}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Approved {new Date(post.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="ml-2">
                              Approved
                            </Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deletePostMutation.mutate(post.id)}
                              disabled={deletePostMutation.isPending}
                              data-testid={`button-delete-post-${post.id}`}
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pending-actions' && (
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

            {activeTab === 'approved-actions' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Approved Custom Actions</h3>
                </div>

                {approvedActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No approved action suggestions yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedActions.map((action) => (
                      <div key={action.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-foreground capitalize" data-testid={`text-approved-action-name-${action.id}`}>
                              {action.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Approved {new Date(action.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="ml-2">
                              Approved
                            </Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteActionMutation.mutate(action.id)}
                              disabled={deleteActionMutation.isPending}
                              data-testid={`button-delete-action-${action.id}`}
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Delete
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
