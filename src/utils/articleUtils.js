/**
 * German Article Education Utilities
 * Handles detection and education state for der/die/das articles
 * Supports user-specific localStorage and backend sync
 */

import api from "../api/axios.js";

const STORAGE_KEY_PREFIX = "skillcase_seen_articles_";

// In-memory cache for education complete status
let educationCompleteCache = null;

/**
 * Get user-specific storage key
 * @param {string} userId - User ID
 * @returns {string} - Storage key
 */
function getStorageKey(userId) {
  return userId ? `${STORAGE_KEY_PREFIX}${userId}` : STORAGE_KEY_PREFIX;
}

// Article definitions with educational information
export const ARTICLES = {
  der: {
    gender: "masculine",
    color: "#3B82F6", // blue
    label: "Masculine (e.g. Man, Table)",
    description:
      "Der is the definite article for <strong>Masculine nouns</strong> in German.",
    examples: [
      "der Mann (the man)",
      "der Tisch (the table)",
      "der Apfel (the apple)",
    ],
    tip: "Unlike English, German noun genders don't always follow logic. Memorize each noun with its article!",
  },
  die: {
    gender: "feminine/plural",
    color: "#EF4444", // red
    label: "Feminine / Plural (e.g. Woman, Flowers)",
    description:
      "Die is the definite article for <strong>Feminine nouns</strong>, and also for <strong>ALL plurals</strong> regardless of gender.",
    examples: [
      "die Frau (the woman) - feminine",
      "die Blume (the flower) - feminine",
      "die Männer (the men) - plural",
      "die Blumen (the flowers) - plural",
    ],
    tip: 'When you see "die", ask yourself: Is this feminine singular or any plural?',
  },
  das: {
    gender: "Neutral",
    color: "#22C55E", // green
    label: "Neutral (e.g. Child, Car)",
    description:
      "Das is the definite article for <strong>Neutral nouns</strong> in German.",
    examples: [
      "das Kind (the child)",
      "das Buch (the book)",
      "das Haus (the house)",
    ],
    tip: 'Many words borrowed from other languages use "das" (das Auto, das Hotel).',
  },
};

/**
 * Detect all articles in content
 * @param {string} content - Flashcard content to check
 * @returns {string[]} - Array of detected articles ('der', 'die', 'das')
 */
export function detectArticles(content) {
  if (!content || typeof content !== "string") return [];

  const found = new Set();
  const lowerContent = content.toLowerCase();

  // Check for all three articles (as separate words)
  // Using word boundaries to avoid false positives
  if (/\bder\s/i.test(lowerContent)) found.add("der");
  if (/\bdie\s/i.test(lowerContent)) found.add("die");
  if (/\bdas\s/i.test(lowerContent)) found.add("das");

  return Array.from(found);
}

/**
 * Detect if content starts with an article (legacy - kept for backwards compatibility)
 * @param {string} content - Flashcard content to check
 * @returns {string|null} - Detected article ('der', 'die', 'das') or null
 */
export function detectArticle(content) {
  const articles = detectArticles(content);
  return articles.length > 0 ? articles[0] : null;
}

/**
 * Detect if content has both singular and plural forms (comma-separated)
 * @param {string} content - Flashcard content to check
 * @returns {boolean}
 */
export function hasSingularPlural(content) {
  if (!content || typeof content !== "string") return false;

  // Check if content has comma (indicating singular, plural format)
  // Example: "die Gurke, die Gurken" or "das Land, die Länder"
  const parts = content.split(",").map((s) => s.trim());

  // Must have exactly 2 parts, and both should have articles
  if (parts.length === 2) {
    const articles1 = detectArticles(parts[0]);
    const articles2 = detectArticles(parts[1]);
    return articles1.length > 0 && articles2.length > 0;
  }

  return false;
}

/**
 * Fetch article education status from backend
 * @returns {Promise<boolean>} - True if education complete
 */
export async function fetchEducationStatus() {
  try {
    const res = await api.get("/user/article-education");
    educationCompleteCache = res.data.complete || false;
    return educationCompleteCache;
  } catch (err) {
    console.error("Error fetching article education status:", err);
    return false;
  }
}

/**
 * Check if education is complete (use cache if available)
 * @returns {boolean}
 */
export function isEducationComplete() {
  return educationCompleteCache === true;
}

/**
 * Mark article education as complete in backend
 * @returns {Promise<boolean>} - Success
 */
export async function markEducationCompleteInDB() {
  try {
    await api.post("/user/article-education/complete");
    educationCompleteCache = true;
    return true;
  } catch (err) {
    console.error("Error marking article education complete:", err);
    return false;
  }
}

/**
 * Get set of articles the user has already seen (user-specific)
 * @param {string} userId - User ID
 * @returns {Set<string>} - Set of seen articles ('der', 'die', 'das')
 */
export function getSeenArticles(userId) {
  try {
    const key = getStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return new Set();

    const parsed = JSON.parse(stored);
    return new Set(parsed);
  } catch (err) {
    console.error("Error reading seen articles from localStorage:", err);
    return new Set();
  }
}

/**
 * Mark an article as seen by the user (user-specific)
 * Also checks if all 3 seen and marks complete in DB
 * @param {string} article - Article to mark ('der', 'die', 'das')
 * @param {string} userId - User ID
 */
export async function markArticleSeen(article, userId) {
  if (!article || !ARTICLES[article]) return;

  try {
    const key = getStorageKey(userId);
    const seen = getSeenArticles(userId);
    seen.add(article);
    localStorage.setItem(key, JSON.stringify([...seen]));

    // If all 3 articles seen, mark complete in DB
    if (seen.size === 3) {
      await markEducationCompleteInDB();
    }
  } catch (err) {
    console.error("Error saving seen article to localStorage:", err);
  }
}

/**
 * Check if user has seen a specific article (user-specific)
 * @param {string} article - Article to check ('der', 'die', 'das')
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function hasSeenArticle(article, userId) {
  const seen = getSeenArticles(userId);
  return seen.has(article);
}

/**
 * Check if user has seen all three articles (user-specific)
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function allArticlesSeen(userId) {
  const seen = getSeenArticles(userId);
  return seen.size === 3;
}

/**
 * Get count of articles user has seen (user-specific)
 * @param {string} userId - User ID
 * @returns {number} - Count (0-3)
 */
export function getSeenArticlesCount(userId) {
  return getSeenArticles(userId).size;
}

/**
 * Reset article education state (for testing/debugging)
 * @param {string} userId - User ID
 */
export function resetArticleEducation(userId) {
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
    educationCompleteCache = null;
  } catch (err) {
    console.error("Error resetting article education:", err);
  }
}
