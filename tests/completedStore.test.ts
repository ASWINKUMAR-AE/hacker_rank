import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompletedChallengeStore } from '../backend/src/services/completedStore';
import * as fs from 'fs';
import * as path from 'path';

describe('CompletedChallengeStore - Non-repeating question manager', () => {
  const testStorePath = path.resolve(process.cwd(), '.test_completed_challenges.json');

  beforeEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testStorePath)) {
      fs.unlinkSync(testStorePath);
    }
  });

  it('normalizes challenge slugs from URLs and strings correctly', () => {
    const store = new CompletedChallengeStore(testStorePath);
    
    expect(store.normalizeSlug('https://www.hackerrank.com/challenges/weather-observation-station-1/problem')).toBe('weather-observation-station-1');
    expect(store.normalizeSlug('https://www.hackerrank.com/challenges/salary-of-employees?h_r=next-challenge')).toBe('salary-of-employees');
    expect(store.normalizeSlug('weather-observation-station-5')).toBe('weather-observation-station-5');
    expect(store.normalizeSlug('/challenges/revising-the-select-query-i/')).toBe('revising-the-select-query-i');
  });

  it('records completed challenges and prevents repetition', () => {
    const store = new CompletedChallengeStore(testStorePath);
    
    expect(store.isCompleted('weather-observation-station-1')).toBe(false);
    expect(store.getCompletedCount()).toBe(0);

    store.markCompleted('https://www.hackerrank.com/challenges/weather-observation-station-1/problem', 'Weather Observation Station 1');

    expect(store.isCompleted('weather-observation-station-1')).toBe(true);
    expect(store.isCompleted('https://www.hackerrank.com/challenges/weather-observation-station-1')).toBe(true);
    expect(store.getCompletedCount()).toBe(1);

    const list = store.getCompletedList();
    expect(list.length).toBe(1);
    expect(list[0].slug).toBe('weather-observation-station-1');
    expect(list[0].title).toBe('Weather Observation Station 1');
  });

  it('allows unmarking or clearing completed questions', () => {
    const store = new CompletedChallengeStore(testStorePath);
    
    store.markCompleted('sql-query-1', 'Query 1');
    store.markCompleted('sql-query-2', 'Query 2');
    expect(store.getCompletedCount()).toBe(2);

    const removed = store.unmarkCompleted('sql-query-1');
    expect(removed).toBe(true);
    expect(store.isCompleted('sql-query-1')).toBe(false);
    expect(store.isCompleted('sql-query-2')).toBe(true);
    expect(store.getCompletedCount()).toBe(1);

    store.clearAll();
    expect(store.getCompletedCount()).toBe(0);
    expect(store.isCompleted('sql-query-2')).toBe(false);
  });
});
