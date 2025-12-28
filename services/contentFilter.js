// Basic content filtering for kid safety
// This is Phase 1 - keyword-based filtering
// Phase 2 will add Google Cloud Vision API for image analysis

const BLOCKED_KEYWORDS = [
  // Adult content
  'sexy', 'nude', 'naked', 'bikini', 'lingerie', 'underwear',
  'shirtless', 'topless', 'breast', 'cleavage',
  // Violence
  'blood', 'gun', 'weapon', 'violence', 'fight', 'war',
  // Other inappropriate
  'alcohol', 'beer', 'wine', 'smoking', 'cigarette', 'drug',
  'tattoo', 'piercing',
];

const SUSPICIOUS_KEYWORDS = [
  'man', 'woman', 'person', 'people', 'model', 'fashion',
  'fitness', 'workout', 'gym', 'body', 'muscle',
];

/**
 * Check if text contains blocked keywords
 */
export const containsBlockedKeywords = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if text contains suspicious keywords (might need extra scrutiny)
 */
export const containsSuspiciousKeywords = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  return SUSPICIOUS_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Filter images based on metadata (photographer name, alt text, etc.)
 */
export const filterImages = (images) => {
  const filtered = [];
  const blocked = [];
  
  images.forEach(image => {
    const textToCheck = `${image.photographer || ''} ${image.alt || ''}`;
    
    if (containsBlockedKeywords(textToCheck)) {
      blocked.push({
        id: image.id,
        reason: 'Blocked keyword in description',
        text: textToCheck,
      });
    } else {
      filtered.push(image);
    }
  });
  
  // Log blocked images for debugging
  if (blocked.length > 0) {
    console.log(`🛡️ Filtered out ${blocked.length} inappropriate images:`, blocked);
  }
  
  return {
    filtered,
    blocked,
    blockedCount: blocked.length,
  };
};

/**
 * Check if a search term itself is appropriate
 */
export const isSearchTermSafe = (searchTerm) => {
  if (!searchTerm) return false;
  
  const lowerTerm = searchTerm.toLowerCase().trim();
  
  // Block empty searches
  if (lowerTerm.length === 0) return false;
  
  // Block searches with inappropriate keywords
  if (containsBlockedKeywords(lowerTerm)) {
    return false;
  }
  
  return true;
};

/**
 * Get kid-friendly search suggestions based on what they typed
 */
export const getSearchSuggestions = (searchTerm) => {
  const suggestions = [
    // Animals
    'puppies', 'kittens', 'bunnies', 'dogs', 'cats', 'horses', 'dolphins',
    'elephants', 'pandas', 'lions', 'tigers', 'bears', 'birds', 'fish',
    'butterflies', 'ladybugs', 'frogs', 'turtles', 'hamsters',
    // Nature
    'flowers', 'trees', 'rainbow', 'sunset', 'mountains', 'ocean', 'beach',
    'forest', 'garden', 'waterfall', 'clouds', 'stars', 'moon',
    // Fantasy/Fun
    'unicorns', 'dragons', 'mermaids', 'fairies', 'castles', 'princesses',
    'dinosaurs', 'robots', 'spaceships', 'rockets', 'planets',
    // Activities
    'playground', 'toys', 'balloons', 'cake', 'ice cream', 'pizza',
    'books', 'art', 'painting', 'music', 'dancing',
    // Vehicles
    'cars', 'trucks', 'trains', 'airplanes', 'boats', 'helicopters',
  ];
  
  if (!searchTerm || searchTerm.length < 2) {
    return suggestions.slice(0, 10); // Return top 10 popular ones
  }
  
  const lowerTerm = searchTerm.toLowerCase();
  const matches = suggestions.filter(s => s.includes(lowerTerm));
  
  return matches.slice(0, 5); // Return up to 5 matches
};