
import { SemanticChunk } from '../types';
import { generateId } from './id';

/**
 * Chunks text into overlapping segments for semantic indexing, respecting sentence boundaries.
 */
export const chunkText = (text: string, targetChunkSize: number = 500, overlap: number = 100): SemanticChunk[] => {
  const chunks: SemanticChunk[] = [];
  if (!text) return chunks;

  // Split by sentences roughly (using punctuation)
  const sentences = text.match(/[^.!?]+[.!?]+|\s+$/g) || [text];
  
  let currentChunk = '';
  let startIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    
    if ((currentChunk.length + sentence.length) > targetChunkSize && currentChunk.length > 0) {
      // Push current chunk
      chunks.push({
        id: generateId(),
        text: currentChunk.trim(),
        startIndex: startIndex,
        endIndex: startIndex + currentChunk.length
      });
      
      // Start new chunk with overlap
      // Find the last few sentences to use as overlap
      let overlapText = '';
      let overlapIndex = i - 1;
      while (overlapIndex >= 0 && overlapText.length < overlap) {
        overlapText = sentences[overlapIndex] + overlapText;
        overlapIndex--;
      }
      
      startIndex = startIndex + currentChunk.length - overlapText.length;
      currentChunk = overlapText + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  // Push the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: generateId(),
      text: currentChunk.trim(),
      startIndex: startIndex,
      endIndex: startIndex + currentChunk.length
    });
  }

  return chunks;
};
