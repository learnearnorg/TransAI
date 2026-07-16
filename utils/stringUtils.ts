
import { PEMetrics } from '../types';

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching in Translation Memory.
 */
export const getSimilarityScore = (str1: string, str2: string): number => {
  const s1 = (str1 ?? '').toLowerCase().trim();
  const s2 = (str2 ?? '').toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][0] + 1, // Skip this logic for pure lev
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const longestLength = Math.max(s1.length, s2.length);
  return Math.round(((longestLength - distance) / longestLength) * 100);
};

export const calculatePEMetrics = (original: string, edited: string): PEMetrics => {
  const s1 = original || '';
  const s2 = edited || '';
  
  if (s1 === s2) return { editDistance: 0, similarity: 100, effort: 0, addedChars: 0, removedChars: 0 };
  
  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const longestLength = Math.max(s1.length, s2.length);
  const similarity = Math.round(((longestLength - distance) / longestLength) * 100);
  const effort = Math.round((distance / Math.max(1, s1.length)) * 100);
  
  // Basic added/removed estimation
  const addedChars = Math.max(0, s2.length - s1.length);
  const removedChars = Math.max(0, s1.length - s2.length);

  return {
    editDistance: distance,
    similarity,
    effort,
    addedChars,
    removedChars
  };
};
