interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  stats?: { totalPosts: number; totalVotes: number };
  categoryCounts?: Record<string, number>;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange, stats, categoryCounts }: CategoryFilterProps) {
  const categories = [
    // Total posts uses backend stats when available; otherwise fall back to sum of categoryCounts
    { id: 'all', name: 'All', icon: 'fas fa-star', count: stats?.totalPosts ?? (categoryCounts ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) : null) },
    // Use derived per-category counts from props; show placeholder when unavailable
    { id: 'film', name: 'Film Stars', icon: 'fas fa-film', count: categoryCounts?.['film'] ?? null },
    { id: 'fictional', name: 'Fictional', icon: 'fas fa-mask', count: categoryCounts?.['fictional'] ?? null },
    { id: 'political', name: 'Political', icon: 'fas fa-landmark', count: categoryCounts?.['political'] ?? null },
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
                {category.count === null ? '—' : category.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
