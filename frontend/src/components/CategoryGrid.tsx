import React from 'react';
import { Film, Newspaper, Music, Trophy, Gamepad2, Tv, Sparkles, BookOpen, Baby, Heart } from 'lucide-react';
import { CategoryCount } from '../types';

interface CategoryGridProps {
  categories: CategoryCount[];
  onSelectCategory: (category: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, onSelectCategory }) => {
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('news')) return Newspaper;
    if (lower.includes('movie') || lower.includes('cinema')) return Film;
    if (lower.includes('music')) return Music;
    if (lower.includes('sport')) return Trophy;
    if (lower.includes('animation') || lower.includes('kid')) return Baby;
    if (lower.includes('game') || lower.includes('esport')) return Gamepad2;
    if (lower.includes('doc') || lower.includes('educat')) return BookOpen;
    if (lower.includes('lifestyle') || lower.includes('relig')) return Heart;
    return Tv;
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          Browse by Category
        </h3>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {categories.length} categories available
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {categories.map((c) => {
          const Icon = getCategoryIcon(c.category);
          return (
            <button
              key={c.category}
              onClick={() => onSelectCategory(c.category)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.625rem',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
              className="category-tile"
            >
              <div
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  backgroundColor: 'rgba(34, 211, 238, 0.08)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.category}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.count} channel{c.count === 1 ? '' : 's'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
