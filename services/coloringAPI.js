import axios from 'axios';
import { PIXABAY_API_KEY } from '../config/constants';
import { filterImages } from './contentFilter';

const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

export const searchColoringPages = async (query, page = 1, perPage = 30) => {
  try {
    // Search specifically for coloring page style images
    const coloringQuery = query;
console.log('🔍 Coloring query:', coloringQuery);
    
    const response = await axios.get(PIXABAY_BASE_URL, {
      params: {
        key: PIXABAY_API_KEY,
        q: coloringQuery,
        image_type: 'vector',
        per_page: perPage,
        page: page,
        safesearch: 'true',
        editors_choice: 'false',
        category: 'education', // Often has line art
      },
    });

    // Transform response
    const images = response.data.hits.map(hit => ({
      id: hit.id,
      url: hit.largeImageURL,
      thumbnail: hit.webformatURL,
      photographer: hit.user,
      alt: hit.tags || query,
      isColoringPage: true,
    }));

    const { filtered, blockedCount } = filterImages(images);

    if (blockedCount > 0) {
      console.log(`🎨 Filtered ${blockedCount} coloring page images for "${query}"`);
    }

    return {
      images: filtered,
      totalResults: response.data.totalHits,
      hasMore: page * perPage < response.data.totalHits,
      filteredCount: blockedCount,
    };
  } catch (error) {
    console.error('Error fetching coloring pages:', error);
    throw new Error('Failed to fetch coloring pages. Please try again.');
  }
};