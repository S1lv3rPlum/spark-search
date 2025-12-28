import axios from 'axios';
import { PIXABAY_API_KEY } from '../config/constants';
import { filterImages } from './contentFilter';

const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

export const searchImages = async (query, page = 1, perPage = 30) => {
  try {
    const response = await axios.get(PIXABAY_BASE_URL, {
      params: {
        key: PIXABAY_API_KEY,
        q: query,
        image_type: 'photo',
        per_page: perPage,
        page: page,
        safesearch: 'true',
        editors_choice: 'false',
        orientation: 'horizontal',
      },
    });

    const images = response.data.hits.map(hit => ({
      id: hit.id,
      url: hit.largeImageURL,
      thumbnail: hit.webformatURL,
      photographer: hit.user,
      alt: hit.tags || query,
    }));

    const { filtered, blockedCount } = filterImages(images);

    if (blockedCount > 0) {
      console.log(`🛡️ Pixabay: Filtered ${blockedCount} images for "${query}"`);
    }

    return {
      images: filtered,
      totalResults: response.data.totalHits,
      hasMore: page * perPage < response.data.totalHits,
      filteredCount: blockedCount,
    };
  } catch (error) {
    console.error('Error fetching images from Pixabay:', error);
    throw new Error('Failed to fetch images. Please try again.');
  }
};