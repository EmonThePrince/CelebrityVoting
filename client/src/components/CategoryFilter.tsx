interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  stats?: { totalPosts: number; totalVotes: number };
}

export default function CategoryFilter({ selectedCategory, onCategoryChange, stats }: CategoryFilterProps) {
  const categories = [
    { id: 'all', name: 'All', icon: 'fas fa-star', count: stats?.totalPosts || 0 },
    { id: 'film', name: 'Film Stars', icon: 'fas fa-film', count: 0 }, // Would need separate API for category counts
    { id: 'fictional', name: 'Fictional', icon: 'fas fa-mask', count: 0 },
    { id: 'political', name: 'Political', icon: 'fas fa-landmark', count: 0 },
  ];

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto py-4">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
              }`}
              onClick={() => onCategoryChange(category.id)}
              data-testid={`button-category-${category.id}`}
            >
              <i className={category.icon}></i>
              <span>{category.name}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                selectedCategory === category.id 
                  ? 'bg-primary-foreground text-primary' 
                  : 'bg-card text-foreground'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
