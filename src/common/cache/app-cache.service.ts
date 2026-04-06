import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

/**
 * Thin wrapper around cache-manager for typed get/set/invalidation.
 *
 * Tracks keys internally to support prefix-based invalidation,
 * since cache-manager v6 (Keyv-based) does not expose a keys() API.
 */
@Injectable()
export class AppCacheService {
  private trackedKeys = new Set<string>();

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.trackedKeys.add(key);
    await this.cache.set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    this.trackedKeys.delete(key);
    await this.cache.del(key);
  }

  /** Delete all keys that start with a given prefix. */
  async invalidateByPrefix(prefix: string): Promise<void> {
    const toDelete: string[] = [];
    for (const key of this.trackedKeys) {
      if (key.startsWith(prefix)) toDelete.push(key);
    }
    await Promise.all(toDelete.map((k) => this.del(k)));
  }
}
