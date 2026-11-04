import axios from 'axios';
import { PIXABAY_API_KEY } from '../config/constants';
import { filterImages } from './contentFilter';

const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

const fetchVectors = (q, page, perPage) =>
  axios.get(PIXABAY_BASE_URL, {
    params: {
      key: PIXABAY_API_KEY,
      q,
      image_type: 'vector',
      per_page: perPage,
      page,
      safesearch: 'true',
    },
  });

export const searchColoringPages = async (query, page = 1, perPage = 30) => {
  try {
    // Ask for line-art style first; if that finds nothing, fall back to the plain term
    let response = await fetchVectors(`${query} coloring page`, page, perPage);
    if (response.data.hits.length === 0 && page === 1) {
      response = await fetchVectors(`${query} outline`, page, perPage);
    }
    if (response.data.hits.length === 0 && page === 1) {
      response = await fetchVectors(query, page, perPage);
    }

    const images = response.data.hits.map(hit => ({
      id: hit.id,
      url: hit.largeImageURL,
      thumbnail: hit.webformatURL,
      photographer: hit.user,
      alt: hit.tags || query,
      isColoringPage: true,
    }));

    const { filtered, blockedCount } = filterImages(images);

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
