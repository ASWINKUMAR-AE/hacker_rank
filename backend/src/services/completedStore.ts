import * as fs from 'fs';
import * as path from 'path';

export interface CompletedChallengeItem {
  slug: string;
  title?: string;
  completedAt: string;
}

export class CompletedChallengeStore {
  private static instance: CompletedChallengeStore;
  private filePath: string;
  private items: Map<string, CompletedChallengeItem> = new Map();

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), '.completed_challenges.json');
    this.load();
  }

  public static getInstance(filePath?: string): CompletedChallengeStore {
    if (!CompletedChallengeStore.instance) {
      CompletedChallengeStore.instance = new CompletedChallengeStore(filePath);
    }
    return CompletedChallengeStore.instance;
  }

  /**
   * Normalizes any url or slug into a clean challenge slug
   */
  public normalizeSlug(input: string): string {
    if (!input) return '';
    let cleaned = input.trim();
    const match = cleaned.match(/\/challenges\/([^\/\?#]+)/i);
    if (match) {
      return match[1].toLowerCase();
    }
    // Remove query params or trailing slashes
    cleaned = cleaned.split('?')[0].split('#')[0].replace(/\/+$/, '');
    const parts = cleaned.split('/');
    return (parts[parts.length - 1] || cleaned).toLowerCase();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string') {
              const slug = this.normalizeSlug(item);
              if (slug) {
                this.items.set(slug, { slug, completedAt: new Date().toISOString() });
              }
            } else if (item && item.slug) {
              const slug = this.normalizeSlug(item.slug);
              if (slug) {
                this.items.set(slug, {
                  slug,
                  title: item.title,
                  completedAt: item.completedAt || new Date().toISOString()
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load completed challenges store:', err);
    }
  }

  private save(): void {
    try {
      const list = Array.from(this.items.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save completed challenges store:', err);
    }
  }

  public isCompleted(slugOrUrlOrTitle: string): boolean {
    if (!slugOrUrlOrTitle) return false;
    const slug = this.normalizeSlug(slugOrUrlOrTitle);
    return this.items.has(slug);
  }

  public markCompleted(slugOrUrl: string, title?: string): void {
    const slug = this.normalizeSlug(slugOrUrl);
    if (!slug) return;
    this.items.set(slug, {
      slug,
      title: title || this.items.get(slug)?.title,
      completedAt: new Date().toISOString()
    });
    this.save();
  }

  public unmarkCompleted(slugOrUrl: string): boolean {
    const slug = this.normalizeSlug(slugOrUrl);
    const removed = this.items.delete(slug);
    if (removed) {
      this.save();
    }
    return removed;
  }

  public getCompletedList(): CompletedChallengeItem[] {
    return Array.from(this.items.values());
  }

  public getCompletedSlugs(): Set<string> {
    return new Set(this.items.keys());
  }

  public getCompletedCount(): number {
    return this.items.size;
  }

  public clearAll(): void {
    this.items.clear();
    this.save();
  }
}
