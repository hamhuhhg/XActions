import { describe, it, expect } from 'vitest';
import * as scrapers from '../src/scrapers/index.js';
import defaultScrapers from '../src/scrapers/index.js';

describe('XActions Scrapers Registry & Exports', () => {
  it('should export all profile scraping functions', () => {
    expect(typeof scrapers.scrapeProfile).toBe('function');
    expect(typeof scrapers.scrapeFollowers).toBe('function');
    expect(typeof scrapers.scrapeFollowing).toBe('function');
  });

  it('should export all tweet scraping functions', () => {
    expect(typeof scrapers.scrapeTweets).toBe('function');
    expect(typeof scrapers.searchTweets).toBe('function');
    expect(typeof scrapers.scrapeThread).toBe('function');
    expect(typeof scrapers.scrapeLikes).toBe('function');
    expect(typeof scrapers.scrapeHashtag).toBe('function');
    expect(typeof scrapers.scrapeMedia).toBe('function');
    expect(typeof scrapers.scrapeListMembers).toBe('function');
  });

  it('should export authentication and session helpers', () => {
    expect(typeof scrapers.loginWithCookie).toBe('function');
    expect(typeof scrapers.loginWithFacebookCookie).toBe('function');
  });

  it('should export data export utilities', () => {
    expect(typeof scrapers.exportToJSON).toBe('function');
    expect(typeof scrapers.exportToCSV).toBe('function');
  });

  it('should provide default object export for backward compatibility', () => {
    expect(defaultScrapers.scrapeProfile).toBe(scrapers.scrapeProfile);
    expect(defaultScrapers.scrapeTweets).toBe(scrapers.scrapeTweets);
    expect(defaultScrapers.exportToJSON).toBe(scrapers.exportToJSON);
    expect(defaultScrapers.createBrowser).toBe(scrapers.createBrowser);
  });
});
