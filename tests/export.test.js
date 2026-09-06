import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { exportToJSON, exportToCSV } from '../src/scrapers/export.js';

describe('XActions Exporter (JSON & CSV)', () => {
  const tmpDir = path.join(process.cwd(), 'tests', 'tmp_exports');
  const jsonPath = path.join(tmpDir, 'test.json');
  const csvPath = path.join(tmpDir, 'test.csv');

  afterAll(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('should export nested data structures to JSON', async () => {
    const sampleData = [{ id: '1', user: { name: 'Test' }, count: 42 }];
    const res = await exportToJSON(sampleData, jsonPath);
    expect(res).toBe(jsonPath);

    const content = await fs.readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(sampleData);
  });

  it('should export objects and nested fields to CSV properly escaped', async () => {
    const sampleData = [
      { username: 'alice', bio: 'Hello, "World"', meta: { verified: true } },
      { username: 'bob', bio: 'Line1\nLine2', meta: { verified: false } },
    ];
    const res = await exportToCSV(sampleData, csvPath);
    expect(res).toBe(csvPath);

    const content = await fs.readFile(csvPath, 'utf8');
    expect(content).toContain('username,bio,meta');
    expect(content).toContain('"alice"');
    expect(content).toContain('""verified"":true');
  });

  it('should handle empty array in CSV gracefully', async () => {
    const emptyCsvPath = path.join(tmpDir, 'empty.csv');
    const res = await exportToCSV([], emptyCsvPath);
    expect(res).toBe(emptyCsvPath);
    const content = await fs.readFile(emptyCsvPath, 'utf8');
    expect(content).toBe('');
  });
});
