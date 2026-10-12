import React from 'react';

interface SkeletonCardProps {
  viewMode?: 'grid' | 'list';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          gap: '1rem',
        }}
        className="animate-pulse"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '0.375rem', backgroundColor: 'var(--border)' }} />
          <div style={{ flex: 1, maxWidth: '240px' }}>
            <div style={{ height: '14px', width: '70%', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '6px' }} />
            <div style={{ height: '10px', width: '40%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ width: '90px', height: '22px', backgroundColor: 'var(--border)', borderRadius: '9999px' }} />
        <div style={{ width: '60px', height: '28px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '180px',
      }}
      className="animate-pulse"
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '0.5rem', backgroundColor: 'var(--border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: '16px', width: '65%', backgroundColor: 'var(--border)', borderRadius: '4px', marginBottom: '6px' }} />
            <div style={{ height: '12px', width: '40%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          </div>
        </div>
        <div style={{ width: '120px', height: '22px', backgroundColor: 'var(--border)', borderRadius: '9999px', marginTop: '0.5rem' }} />
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1, height: '34px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
        <div style={{ width: '34px', height: '34px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
      </div>
    </div>
  );
};

