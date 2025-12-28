import axios from 'axios';
import { PEXELS_API_KEY } from '../config/constants';
import { filterImages } from './contentFilter';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

export const searchImages = async (query, page = 1, perPage = 30) => {
  try {
    // Request more images than needed so we have extras after filtering
    const response = await axios.get(`${PEXELS_BASE_URL}/search`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      params: {
        query: query,
        per_page: perPage,
        page: page,
        orientation: 'square', // Better for grid display
      },
    });

    // Transform the response to a simpler format
    const images = response.data.photos.map(photo => ({
      id: photo.id,
      url: photo.src.large,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      alt: photo.alt || query,
    }));

    // Apply content filtering
    const { filtered, blockedCount } = filterImages(images);

    // If we filtered out too many, log a warning
    if (blockedCount > images.length * 0.3) {
      console.warn(`⚠️ Filtered out ${blockedCount}/${images.length} images for "${query}"`);
    }

    return {
      images: filtered,
      totalResults: response.data.total_results,
      hasMore: response.data.page < response.data.total_results / perPage,
      filteredCount: blockedCount,
    };
  } catch (error) {
    console.error('Error fetching images from Pexels:', error);
    
    // Check if it's a 404 (no results)
    if (error.response && error.response.status === 404) {
      throw new Error('No images found. Try a different search!');
    }
    
    throw new Error('Failed to fetch images. Please try again.');
  }
};

export const getCuratedImages = async (page = 1, perPage = 30) => {
  try {
    const response = await axios.get(`${PEXELS_BASE_URL}/curated`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
      params: {
        per_page: perPage,
        page: page,
      },
    });

    const images = response.data.photos.map(photo => ({
      id: photo.id,
      url: photo.src.large,
      thumbnail: photo.src.medium,
      photographer: photo.photographer,
      alt: photo.alt || 'Curated photo',
    }));

    // Apply content filtering
    const { filtered } = filterImages(images);

    return {
      images: filtered,
      hasMore: response.data.page < response.data.total_results / perPage,
    };
  } catch (error) {
    console.error('Error fetching curated images:', error);
    throw new Error('Failed to fetch images. Please try again.');
  }
};