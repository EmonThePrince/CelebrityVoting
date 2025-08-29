interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSubmitClick: () => void;
}

export default function Header({ searchQuery, onSearchChange, onSubmitClick }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">🎭 CelebVote</h1>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
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
            <a href="#home" className="text-foreground hover:text-primary font-medium">Home</a>
            <a href="#trending" className="text-foreground hover:text-primary font-medium">Trending</a>
            <a href="#leaderboard" className="text-foreground hover:text-primary font-medium">Leaderboard</a>
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
          <button className="md:hidden p-2" data-testid="button-mobile-menu">
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
