import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-4">🎭 CelebVote</h1>
            <p className="text-muted-foreground mb-6">
              Vote on your favorite celebrities, fictional characters, and politicians with interactive actions!
            </p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              data-testid="button-admin-login"
            >
              Admin Login
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Admin access required for content management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
