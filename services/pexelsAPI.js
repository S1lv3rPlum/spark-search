import axios from 'axios';
import { PEXELS_API_KEY } from '../config/constants';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

export const searchImages = async (query, page = 1, perPage = 20) => {
  try {
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

    return {
      images,
      totalResults: response.data.total_results,
      hasMore: response.data.page < response.data.total_results / perPage,
    };
  } catch (error) {
    console.error('Error fetching images from Pexels:', error);
    throw new Error('Failed to fetch images. Please try again.');
  }
};

export const getCuratedImages = async (page = 1, perPage = 20) => {
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

    return {
      images,
      hasMore: response.data.page < response.data.total_results / perPage,
    };
  } catch (error) {
    console.error('Error fetching curated images:', error);
    throw new Error('Failed to fetch images. Please try again.');
  }
};