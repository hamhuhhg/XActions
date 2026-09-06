/**
 * XActions Core Selectors Registry
 * Single Source of Truth for all X/Twitter DOM Elements
 *
 * Provides resilient, categorized selectors with fallback strategies
 * to ensure automation scripts survive X DOM updates.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

export const SELECTORS = {
  // === Tweet & Post Elements ===
  tweet: {
    container: 'article[data-testid="tweet"]',
    text: '[data-testid="tweetText"]',
    link: 'a[href*="/status/"]',
    quoteTweet: 'article[data-testid="tweet"] [data-testid="tweet"]',
    media:
      '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]',
    timestamp: 'time',
    userHandle: '[data-testid="User-Name"] a[href^="/"]',
    userName: '[data-testid="User-Name"] span',
    verifiedBadge: '[data-testid="icon-verified"]',
    analyticsButton: '[data-testid="analyticsButton"]',
  },

  // === Action Buttons on Tweets ===
  actions: {
    like: '[data-testid="like"]',
    unlike: '[data-testid="unlike"]',
    retweet: '[data-testid="retweet"]',
    unretweet: '[data-testid="unretweet"]',
    retweetConfirm: '[data-testid="retweetConfirm"]',
    unretweetConfirm: '[data-testid="unretweetConfirm"]',
    reply: '[data-testid="reply"]',
    share: '[data-testid="share"]',
    bookmark: '[data-testid="bookmark"]',
    removeBookmark: '[data-testid="removeBookmark"]',
    viewsCount: 'a[href*="/analytics"]',
  },

  // === Follow / Unfollow / Relationship ===
  relationship: {
    follow: '[data-testid$="-follow"]',
    unfollow: '[data-testid$="-unfollow"]',
    userCell: '[data-testid="UserCell"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    followButtonFallback: 'button[aria-label^="Follow @"], button[aria-label^="Follow "]',
    unfollowButtonFallback: 'button[aria-label^="Following @"], button[aria-label^="Following "]',
    pendingFollow: '[data-testid$="-pending"]',
  },

  // === Compose & Post Creation ===
  compose: {
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    tweetButtonInline: '[data-testid="tweetButtonInline"]',
    replyTextarea: '[data-testid="tweetTextarea_0"]',
    dmTextarea: '[data-testid="dmComposerTextInput"]',
    dmSendButton: '[data-testid="dmComposerSendButton"]',
    mediaUploadInput: 'input[data-testid="fileInput"]',
    scheduleButton: '[data-testid="scheduleOption"]',
    emojiButton: '[data-testid="emojiButton"]',
  },

  // === Navigation & App Bar ===
  navigation: {
    backButton: '[data-testid="app-bar-back"]',
    homeNav: 'a[data-testid="AppTabBar_Home_Link"]',
    exploreNav: 'a[data-testid="AppTabBar_Explore_Link"]',
    notificationsNav: 'a[data-testid="AppTabBar_Notifications_Link"]',
    messagesNav: 'a[data-testid="AppTabBar_DirectMessage_Link"]',
    bookmarksNav: 'a[data-testid="AppTabBar_Bookmarks_Link"]',
    profileNav: 'a[data-testid="AppTabBar_Profile_Link"]',
    communitiesNav: 'a[aria-label="Communities"], a[data-testid="AppTabBar_Communities_Link"]',
    moreMenu: '[data-testid="AppTabBar_More_Menu"]',
  },

  // === Search ===
  search: {
    input: '[data-testid="SearchBox_Search_Input"]',
    clearButton: '[data-testid="clearButton"]',
    searchResultItem: '[data-testid="TypeaheadUser"]',
  },

  // === Profile Elements ===
  profile: {
    header: '[data-testid="UserProfileHeader_Items"]',
    avatar: '[data-testid="UserAvatar-Container"]',
    name: '[data-testid="UserName"]',
    bio: '[data-testid="UserDescription"]',
    location: '[data-testid="UserLocation"]',
    url: '[data-testid="UserUrl"]',
    joinDate: '[data-testid="UserJoinDate"]',
    birthday: '[data-testid="UserBirthday"]',
    followingCount: 'a[href$="/following"] span',
    followersCount: 'a[href$="/verified_followers"] span, a[href$="/followers"] span',
    editProfileButton: '[data-testid="editProfileButton"]',
    primaryColumn: '[data-testid="primaryColumn"]',
    emptyState: '[data-testid="emptyState"]',
  },

  // === Dialogs & Modals ===
  dialogs: {
    confirmSheet: '[data-testid="sheetDialog"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    cancelButton: '[data-testid="confirmationSheetCancel"]',
    modalClose: '[data-testid="app-bar-close"], [data-testid="xMigrationBottomBar"]',
  },

  // === Communities ===
  communities: {
    joinedButton: 'button[aria-label^="Joined"]',
    joinButton: 'button[aria-label^="Join"]',
    communityLink: 'a[href^="/i/communities/"]',
  },
};

/**
 * Get selector with optional fallback
 * @param {string} path - Dot notation path, e.g., 'tweet.container' or 'actions.like'
 * @returns {string} The CSS selector
 */
export function getSelector(path) {
  const parts = path.split('.');
  let current = SELECTORS;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export default SELECTORS;
