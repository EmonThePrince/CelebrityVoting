import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PostWithVotes, ActionType } from "@/lib/types";

interface PostCardProps {
  post: PostWithVotes;
  onVoteSuccess: () => void;
}

declare global {
  interface Window {
    grecaptcha?: any;
  }
}

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

async function loadRecaptcha(): Promise<void> {
  // If v2 already initialized, nothing to do
  if (window.grecaptcha && typeof window.grecaptcha.render === 'function') return;

  // If a v3-style grecaptcha is present (no render), remove it to allow v2 to initialize
  if (window.grecaptcha && typeof window.grecaptcha.render !== 'function') {
    try { delete (window as any).grecaptcha; } catch {}
  }

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const start = Date.now();
      const check = () => {
        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
          resolve();
        } else if (Date.now() - start > 5000) {
          reject(new Error('reCAPTCHA v2 failed to initialize'));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    s.onerror = () => reject(new Error('Failed to load reCAPTCHA v2'));
    document.head.appendChild(s);
  });
}

export default function PostCard({ post, onVoteSuccess }: PostCardProps) {
  const { toast } = useToast();
  const [votingAction, setVotingAction] = useState<string | null>(null);
  const [votedActions, setVotedActions] = useState<Set<string>>(new Set());

  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { data: actions = [] } = useQuery<ActionType[]>({
    queryKey: ['/api/actions'],
  });

  useEffect(() => {
    let mounted = true;
    loadRecaptcha().then(() => {
      if (!mounted) return;
      if (recaptchaContainerRef.current && window.grecaptcha && widgetId === null) {
        const id = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(null),
          'error-callback': () => setCaptchaToken(null),
        });
        setWidgetId(id);
      }
    });
    return () => { mounted = false; };
  }, []);

  const voteMutation = useMutation({
    mutationFn: async ({ actionId, postId, captchaToken }: { actionId: string; postId: string; captchaToken: string }) => {
      const response = await apiRequest('POST', `/api/vote/${actionId}`, { postId, captchaToken });
      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      const { actionId } = variables;
      const actionName = actions.find(a => a.id === actionId)?.name || '';
      
      if (data.action === 'already') {
        toast({
          title: "Already voted",
          description: "You have already voted for this action.",
        });
      } else {
        toast({
          title: "Vote submitted!",
          description: "Your vote has been counted.",
        });
      }
      onVoteSuccess();
      setVotingAction(null);
      if (widgetId !== null && window.grecaptcha) { try { window.grecaptcha.reset(widgetId); } catch {} }
      setCaptchaToken(null);
    },
    onError: (error: Error) => {
      setVotingAction(null);
      console.error('Vote mutation error:', error);
      toast({
        title: "Error",
        description: error.message.includes('Rate limit')
          ? "Please wait before voting again"
          : "Failed to submit vote",
        variant: "destructive",
      });
      if (widgetId !== null && window.grecaptcha) { try { window.grecaptcha.reset(widgetId); } catch {} }
      setCaptchaToken(null);
    },
  });

  const handleVote = async (actionId: string, actionName: string) => {
    try {
      setVotingAction(actionName);
      if (!captchaToken) {
        toast({ title: 'Captcha required', description: 'Please complete the captcha checkbox.', variant: 'destructive' });
        setVotingAction(null);
        return;
      }
      voteMutation.mutate({ actionId, postId: post.id, captchaToken });
    } catch (e) {
      setVotingAction(null);
      toast({ title: 'Captcha failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const getActionIcon = (actionName: string) => {
    const icons: Record<string, string> = {
      slap: 'fas fa-hand-paper',
      hug: 'fas fa-heart',
      kiss: 'fas fa-kiss',
      love: 'fas fa-heart',
      hate: 'fas fa-thumbs-down',
    };
    return icons[actionName] || 'fas fa-star';
  };

  const getActionColor = (actionName: string) => {
    const colors: Record<string, string> = {
      slap: 'hover:bg-red-100 hover:text-red-600',
      hug: 'hover:bg-blue-100 hover:text-blue-600',
      kiss: 'hover:bg-pink-100 hover:text-pink-600',
      love: 'hover:bg-green-100 hover:text-green-600',
      hate: 'hover:bg-red-100 hover:text-red-600',
    };
    return colors[actionName] || 'hover:bg-gray-100 hover:text-gray-600';
  };

  const getVotedStyle = (actionName: string) => {
    if (votedActions.has(actionName)) {
      const votedColors: Record<string, string> = {
        slap: 'bg-red-100 text-red-600 border-red-300',
        hug: 'bg-blue-100 text-blue-600 border-blue-300',
        kiss: 'bg-pink-100 text-pink-600 border-pink-300',
        love: 'bg-green-100 text-green-600 border-green-300',
        hate: 'bg-red-100 text-red-600 border-red-300',
      };
      return votedColors[actionName] || 'bg-gray-100 text-gray-600 border-gray-300';
    }
    return '';
  };

  const formatVoteCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-shadow" data-testid={`card-post-${post.id}`}>
      {/* Image */}
      <div className="relative h-64 bg-muted">
        <img 
          src={post.imageUrl} 
          alt={post.name}
          className="w-full h-full object-cover"
          data-testid={`img-post-${post.id}`}
        />
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            post.category === 'film' ? 'bg-primary text-primary-foreground' :
            post.category === 'fictional' ? 'bg-accent text-accent-foreground' :
            'bg-destructive text-destructive-foreground'
          }`}>
            {post.category}
          </span>
        </div>
        
        {/* Check if trending */}
        {post.totalVotes > 1000 && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-bold trending-badge">
              🔥 Trending
            </span>
          </div>
        )}
      </div>
      
      {/* Post Content */}
      <div className="p-6">
        <h4 className="text-xl font-bold text-foreground mb-2" data-testid={`text-post-title-${post.id}`}>
          {post.name}
        </h4>
        <p className="text-muted-foreground text-sm mb-4">
          Posted {new Date(post.createdAt).toLocaleDateString()}
        </p>
        
        {/* Vote Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {actions.filter(action => action.approved).map((action) => (
            <button
              key={action.id}
              className={`vote-button flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                getVotedStyle(action.name) || 'bg-muted border-transparent'
              } ${getActionColor(action.name)} ${
                votingAction === action.name ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleVote(action.id, action.name)}
              disabled={votingAction === action.name}
              data-testid={`button-vote-${action.name}-${post.id}`}
            >
              <i className={`${getActionIcon(action.name)} text-xl mb-1`}></i>
              <span className="text-xs font-medium capitalize">{action.name}</span>
              <span className="text-xs font-bold" data-testid={`text-vote-count-${action.name}-${post.id}`}>
                {formatVoteCount(post.votes[action.name] || 0)}
              </span>
            </button>
          ))}
        </div>
        <div className="mb-4">
          <div ref={recaptchaContainerRef}></div>
        </div>
        
        {/* Total Votes */}
        <div className="text-center">
          <span className="text-sm text-muted-foreground">Total Votes: </span>
          <span className="font-bold text-primary" data-testid={`text-total-votes-${post.id}`}>
            {formatVoteCount(post.totalVotes)}
          </span>
        </div>
      </div>
    </div>
  );
}
