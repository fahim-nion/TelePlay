import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCountryName, getCountryFlag, formatAndSortCountries } from './countries.js';

describe('Country Formatting and Sorting Utilities', () => {
  it('resolves country codes to full English names', () => {
    assert.equal(getCountryName('US'), 'United States');
    assert.equal(getCountryName('GB'), 'United Kingdom');
    assert.equal(getCountryName('IT'), 'Italy');
    assert.equal(getCountryName('DE'), 'Germany');
    assert.equal(getCountryName('BD'), 'Bangladesh');
  });

  it('generates regional flag emojis correctly', () => {
    assert.ok(getCountryFlag('US').length > 0);
    assert.equal(getCountryFlag(''), '🌐');
  });

  it('sorts countries alphabetically by full English name rather than by frequency', () => {
    const raw = [
      { country: 'IT', count: 400 },
      { country: 'AU', count: 20 },
      { country: 'BR', count: 50 },
      { country: 'US', count: 100 },
    ];
    const sorted = formatAndSortCountries(raw);
    const names = sorted.map((c) => c.name);
    assert.deepEqual(names, ['Australia', 'Brazil', 'Italy', 'United States']);
  });
});

