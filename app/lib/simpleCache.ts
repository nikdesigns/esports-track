// lib/simpleCache.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

type CacheValue = any;

interface CacheRecord {
  ts: number; // epoch ms when stored
  ttl: number; // seconds
  value: CacheValue;
}

const inMemory = new Map<string, CacheRecord>();

// directory to write cache files; put in OS tmp dir to avoid committing
const CACHE_DIR =
  process.env.SIMPLE_CACHE_DIR || path.join(os.tmpdir(), 'esports-track-cache');

// ensure cache dir exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function filePathForKey(key: string) {
  // sanitize key for filename
  const safe = key.replace(/[^a-z0-9_\-]/gi, '_');
  return path.join(CACHE_DIR, `${safe}.json`);
}

/**
 * Get cached value if valid, otherwise null.
 * @param key cache key
 */
export async function getCache(key: string): Promise<CacheValue | null> {
  // check memory first
  const rec = inMemory.get(key);
  const now = Date.now();
  if (rec) {
    if (now - rec.ts < rec.ttl * 1000) {
      return rec.value;
    } else {
      inMemory.delete(key);
    }
  }

  // try file
  try {
    const fp = filePathForKey(key);
    const raw = await fs.readFile(fp, 'utf8').catch(() => null);
    if (!raw) return null;
    const parsed: CacheRecord = JSON.parse(raw);
    if (now - parsed.ts < parsed.ttl * 1000) {
      // populate memory for faster subsequent calls
      inMemory.set(key, parsed);
      return parsed.value;
    } else {
      // expired; try to remove file
      await fs.unlink(fp).catch(() => {});
      return null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Set cache value in memory and file.
 * @param key
 * @param value
 * @param ttlSeconds
 */
export async function setCache(
  key: string,
  value: CacheValue,
  ttlSeconds = 30
): Promise<void> {
  const rec: CacheRecord = { ts: Date.now(), ttl: ttlSeconds, value };
  inMemory.set(key, rec);
  try {
    await ensureCacheDir();
    const fp = filePathForKey(key);
    await fs.writeFile(fp, JSON.stringify(rec), 'utf8').catch(() => {});
  } catch (e) {
    // ignore write errors
    // (we still have in-memory cache)
  }
}

/**
 * Clear a key (memory + file)
 */
export async function delCache(key: string): Promise<void> {
  inMemory.delete(key);
  try {
    const fp = filePathForKey(key);
    await fs.unlink(fp).catch(() => {});
  } catch (e) {}
}
