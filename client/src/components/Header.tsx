import { useState } from "react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitClick: () => void;
}

export default function Header({ searchQuery, onSearchChange, onSubmitClick }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">🎭 CelebVote</h1>
          </div>
          
          {/* Search Bar (desktop) */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search celebrities, characters, politicians..."
                className="w-full px-4 py-2 pl-10 pr-4 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="input-search"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            </div>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/" className="text-foreground hover:text-primary font-medium">Home</a>
            <a href="/leaderboard" className="text-foreground hover:text-primary font-medium">Leaderboard</a>
            <button 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              onClick={onSubmitClick}
              data-testid="button-submit-post"
            >
              Submit Post
            </button>
            <a 
              href="/admin"
              className="text-muted-foreground hover:text-primary font-medium"
              data-testid="link-admin"
            >
              Admin
            </a>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2" 
            aria-label="Toggle navigation"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(o => !o)}
            data-testid="button-mobile-menu"
          >
            <i className={`${mobileOpen ? 'fas fa-times' : 'fas fa-bars'} text-xl`}></i>
          </button>
        </div>
        {/* Mobile Menu Panel */}
        <div id="mobile-menu" className={`md:hidden pb-4 ${mobileOpen ? '' : 'hidden'}`}>
          <div className="pt-2 pb-3 border-t border-border">
            <div className="px-1 mb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2 pl-10 pr-4 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
              </div>
            </div>
          </div>
          <nav className="space-y-3 px-1">
            <a href="/" className="block text-foreground hover:text-primary font-medium" onClick={() => setMobileOpen(false)}>Home</a>
            <a href="/leaderboard" className="block text-foreground hover:text-primary font-medium" onClick={() => setMobileOpen(false)}>Leaderboard</a>
            <button 
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              onClick={() => { onSubmitClick(); setMobileOpen(false); }}
              data-testid="button-submit-post-mobile"
            >
              Submit Post
            </button>
            <a 
              href="/admin"
              className="block text-muted-foreground hover:text-primary font-medium"
              onClick={() => setMobileOpen(false)}
              data-testid="link-admin-mobile"
            >
              Admin
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
