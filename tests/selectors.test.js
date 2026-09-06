import { describe, it, expect } from 'vitest';
import { SELECTORS, getSelector } from '../src/core/selectors.js';
import * as XActions from '../src/index.js';

describe('XActions Core Selectors', () => {
  it('should export a comprehensive SELECTORS object', () => {
    expect(SELECTORS).toBeDefined();
    expect(typeof SELECTORS).toBe('object');
  });

  it('should define essential tweet selectors', () => {
    expect(SELECTORS.tweet.container).toBe('article[data-testid="tweet"]');
    expect(SELECTORS.tweet.text).toBe('[data-testid="tweetText"]');
    expect(SELECTORS.tweet.link).toContain('/status/');
  });

  it('should define action button selectors', () => {
    expect(SELECTORS.actions.like).toBe('[data-testid="like"]');
    expect(SELECTORS.actions.unlike).toBe('[data-testid="unlike"]');
    expect(SELECTORS.actions.retweet).toBe('[data-testid="retweet"]');
    expect(SELECTORS.actions.reply).toBe('[data-testid="reply"]');
    expect(SELECTORS.actions.bookmark).toBe('[data-testid="bookmark"]');
  });

  it('should define relationship and follow selectors', () => {
    expect(SELECTORS.relationship.follow).toBe('[data-testid$="-follow"]');
    expect(SELECTORS.relationship.unfollow).toBe('[data-testid$="-unfollow"]');
    expect(SELECTORS.relationship.userCell).toBe('[data-testid="UserCell"]');
    expect(SELECTORS.relationship.userFollowIndicator).toBe('[data-testid="userFollowIndicator"]');
  });

  it('should define profile and layout selectors', () => {
    expect(SELECTORS.profile.header).toBe('[data-testid="UserProfileHeader_Items"]');
    expect(SELECTORS.profile.name).toBe('[data-testid="UserName"]');
    expect(SELECTORS.profile.bio).toBe('[data-testid="UserDescription"]');
    expect(SELECTORS.profile.location).toBe('[data-testid="UserLocation"]');
    expect(SELECTORS.profile.primaryColumn).toBe('[data-testid="primaryColumn"]');
    expect(SELECTORS.profile.emptyState).toBe('[data-testid="emptyState"]');
  });

  it('should correctly query selectors using getSelector dot notation', () => {
    expect(getSelector('tweet.container')).toBe('article[data-testid="tweet"]');
    expect(getSelector('actions.like')).toBe('[data-testid="like"]');
    expect(getSelector('dialogs.confirmButton')).toBe('[data-testid="confirmationSheetConfirm"]');
    expect(getSelector('nonexistent.path')).toBeUndefined();
  });

  it('should re-export SELECTORS and core from main package entrypoint', () => {
    expect(XActions.SELECTORS).toBeDefined();
    expect(XActions.getSelector).toBeDefined();
    expect(XActions.core).toBeDefined();
    expect(XActions.scrapers).toBeDefined();
  });
});
