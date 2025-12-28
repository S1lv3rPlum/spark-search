import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { searchImages } from './services/pixabayAPI';
import { THEMES } from './config/constants';
import { isSearchTermSafe, getSearchSuggestions } from './services/contentFilter';

const { width } = Dimensions.get('window');
const LOADING_PHRASES = [
  'Searching the internet for awesome stuff...',
  'Finding the coolest things...',
  'Making sure everything is safe and fun...',
  'Gathering sparkles and wonders...',
  'Exploring the digital world...',
  'Hunting for treasures...',
  'Asking the internet nicely...',
  'Filtering out the boring stuff...',
  'Collecting magical discoveries...',
  'Double-checking for awesomeness...',
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [searchText, setSearchText] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pictures');
  const [currentTheme, setCurrentTheme] = useState('magical');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [recentSearches, setRecentSearches] = useState(['unicorns', 'dinosaurs', 'puppies']);
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);

  const theme = THEMES[currentTheme];

  useEffect(() => {
    if (loading) {
      const randomPhrase = LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)];
      setLoadingPhrase(randomPhrase);
    }
  }, [loading]);

  const handleSearch = async () => {
    if (searchText.trim()) {
      const term = searchText.trim();
      
      // Check if search term is safe
      if (!isSearchTermSafe(term)) {
        alert('⚠️ Please try a different search term!');
        setSearchText('');
        return;
      }
      
      setCurrentSearchTerm(term);
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setHasMore(true);
      
      if (!recentSearches.includes(term)) {
        setRecentSearches([term, ...recentSearches.slice(0, 4)]);
      }

      try {
        if (activeTab === 'pictures') {
          const result = await searchImages(term, 1);
          
          // If we got results but they were all filtered
          if (result.images.length === 0 && result.filteredCount > 0) {
            setError('All results were filtered for safety. Try a different search!');
            setScreen('home');
          } else if (result.images.length === 0) {
            // No results at all - show suggestions
            const suggestions = getSearchSuggestions(term);
            setError(`No images found for "${term}". Try: ${suggestions.slice(0, 3).join(', ')}`);
            setScreen('home');
          } else {
            setImages(result.images);
            setHasMore(result.hasMore);
            setScreen('results');
          }
        } else {
          alert(`${activeTab} coming soon! 🎉`);
        }
      } catch (err) {
        setError(err.message);
        setScreen('home');
      } finally {
        setLoading(false);
        setSearchText('');
      }
    }
  };

  const loadMoreImages = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await searchImages(currentSearchTerm, nextPage);
      setImages([...images, ...result.images]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more images:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreImages();
    }
  };

  const handleRecentSearch = (term) => {
    setSearchText(term);
    setShowAutocomplete(false);
  };

  const handleSearchTextChange = (text) => {
    setSearchText(text);
    
    // Show autocomplete if they've typed 2+ characters
    if (text.length >= 2) {
      const suggestions = getSearchSuggestions(text);
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleSuggestionPress = (suggestion) => {
    setSearchText(suggestion);
    setShowAutocomplete(false);
    // Optionally auto-search when they pick a suggestion
    // handleSearch() with the suggestion
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    setShowThemeModal(false);
  };

  const handleBackToHome = () => {
    setScreen('home');
    setImages([]);
    setError(null);
    setCurrentPage(1);
    setHasMore(true);
  };

  const handleImagePress = (image) => {
    const index = images.findIndex(img => img.id === image.id);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
  };

  const handleNextImage = () => {
    if (selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  const handlePreviousImage = () => {
    if (selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradient} style={styles.gradient}>
          <SafeAreaView style={styles.loadingContainer}>
            <Text style={styles.loadingEmoji}>✨</Text>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>{loadingPhrase}</Text>
            <Text style={styles.loadingSubtext}>Searching for: {currentSearchTerm}</Text>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (screen === 'results') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradient} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={theme.gradient[0]} />
            
            <View style={styles.resultsHeader}>
              <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.resultsTitle}>
                Results for: {currentSearchTerm}
              </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>😕 {error}</Text>
              </View>
            )}

            <ScrollView 
              style={styles.resultsScroll} 
              contentContainerStyle={styles.resultsContent}
              onScroll={handleScroll}
              scrollEventThrottle={400}
            >
              {images.length === 0 ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>
                    No images found for "{currentSearchTerm}"
                  </Text>
                  <Text style={styles.noResultsSubtext}>Try a different search!</Text>
                </View>
              ) : (
                <>
                  <View style={styles.imageGrid}>
                    {images.map((image) => (
                      <TouchableOpacity
                        key={image.id}
                        style={styles.imageCard}
                        onPress={() => handleImagePress(image)}
                      >
                        <Image
                          source={{ uri: image.thumbnail }}
                          style={styles.imageThumb}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {loadingMore && (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.loadingMoreText}>Loading more...</Text>
                    </View>
                  )}
                  
                  {!hasMore && images.length > 0 && (
                    <View style={styles.endOfResults}>
                      <Text style={styles.endOfResultsText}>
                        ✨ That's all for "{currentSearchTerm}"! ✨
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
        
        <Modal
          visible={showImageViewer}
          transparent={false}
          animationType="fade"
          onRequestClose={handleCloseImageViewer}
        >
          <View style={styles.imageViewerContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            
            <SafeAreaView style={styles.imageViewerSafe}>
              <TouchableOpacity 
                style={styles.closeViewerButton}
                onPress={handleCloseImageViewer}
              >
                <Text style={styles.closeViewerText}>✕</Text>
              </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {selectedImageIndex + 1} / {images.length}
              </Text>
            </View>

            <ScrollView
              style={styles.imageScrollView}
              contentContainerStyle={styles.imageScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <Image
                source={{ uri: images[selectedImageIndex]?.url }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.imageNavigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  selectedImageIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={handlePreviousImage}
                disabled={selectedImageIndex === 0}
              >
                <Text style={styles.navButtonText}>←</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  selectedImageIndex === images.length - 1 && styles.navButtonDisabled
                ]}
                onPress={handleNextImage}
                disabled={selectedImageIndex === images.length - 1}
              >
                <Text style={styles.navButtonText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor={theme.gradient[0]} />
          
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.themeButton, { borderColor: theme.accent }]}
              onPress={() => setShowThemeModal(true)}
            >
              <Text style={styles.themeButtonText}>🎨</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
          >
            <View style={styles.header}>
              <Text style={styles.logo}>✨ Spark Search ✨</Text>
              <Text style={[styles.tagline, { color: theme.accentLight }]}>
                Discover magical things! 🌟
              </Text>
            </View>

            <View style={styles.searchWrapper}>
              <View style={[styles.searchGlow, { 
                backgroundColor: theme.accent,
                shadowColor: theme.accent 
              }]} />
              <View style={[styles.searchContainer, { borderColor: theme.accent }]}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="What do you want to explore?"
                  placeholderTextColor="#9ca3af"
                  value={searchText}
                  onChangeText={handleSearchTextChange}
                  onSubmitEditing={handleSearch}
                  onFocus={() => {
                    if (searchText.length >= 2) {
                      const suggestions = getSearchSuggestions(searchText);
                      setAutocompleteSuggestions(suggestions);
                      setShowAutocomplete(suggestions.length > 0);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow suggestion clicks
                    setTimeout(() => setShowAutocomplete(false), 200);
                  }}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearch}
                  disabled={!searchText.trim()}
                >
                  <Text style={styles.searchButtonText}>🔍</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Autocomplete Suggestions */}
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <View style={styles.autocompleteContainer}>
                {autocompleteSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(suggestion)}
                  >
                    <Text style={styles.suggestionIcon}>🔍</Text>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {recentSearches.length > 0 && (
              <View style={styles.recentContainer}>
                <Text style={[styles.recentTitle, { color: theme.accentLight }]}>
                  ⭐ Recent Searches
                </Text>
                <View style={styles.recentBubbles}>
                  {recentSearches.map((term, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.recentBubble, { 
                        backgroundColor: theme.buttonBg,
                        borderColor: theme.buttonBorder 
                      }]}
                      onPress={() => handleRecentSearch(term)}
                    >
                      <Text style={styles.recentBubbleText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.tabsContainer}>
              <Text style={[styles.tabsTitle, { color: theme.accentLight }]}>
                ✨ Search for:
              </Text>
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    { backgroundColor: theme.buttonBg, borderColor: theme.tabBorder },
                    activeTab === 'pictures' && {
                      ...styles.tabActive,
                      borderColor: theme.accent,
                      shadowColor: theme.accent,
                    }
                  ]}
                  onPress={() => handleTabPress('pictures')}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'pictures' && {
                      ...styles.tabTextActive,
                      color: theme.activeTabColor
                    }
                  ]}>
                    🖼️ Pictures
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    { backgroundColor: theme.buttonBg, borderColor: theme.tabBorder },
                    activeTab === 'videos' && {
                      ...styles.tabActive,
                      borderColor: theme.accent,
                      shadowColor: theme.accent,
                    }
                  ]}
                  onPress={() => handleTabPress('videos')}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'videos' && {
                      ...styles.tabTextActive,
                      color: theme.activeTabColor
                    }
                  ]}>
                    🎬 Videos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    { backgroundColor: theme.buttonBg, borderColor: theme.tabBorder },
                    activeTab === 'songs' && {
                      ...styles.tabActive,
                      borderColor: theme.accent,
                      shadowColor: theme.accent,
                    }
                  ]}
                  onPress={() => handleTabPress('songs')}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'songs' && {
                      ...styles.tabTextActive,
                      color: theme.activeTabColor
                    }
                  ]}>
                    🎵 Songs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.accentLight }]}>
                ✨ Made by Data Forge Apps ✨
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>

      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Your Theme 🎨</Text>
            <ScrollView style={styles.themeList}>
              {Object.keys(THEMES).map((themeName) => (
                <TouchableOpacity
                  key={themeName}
                  style={[
                    styles.themeOption,
                    currentTheme === themeName && styles.themeOptionActive
                  ]}
                  onPress={() => handleThemeChange(themeName)}
                >
                  <LinearGradient
                    colors={THEMES[themeName].gradient}
                    style={styles.themePreview}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Text style={styles.themeOptionText}>
                    {THEMES[themeName].name}
                  </Text>
                  {currentTheme === themeName && (
                    <Text style={styles.themeCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
  },
  searchWrapper: {
    position: 'relative',
  },
  searchGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    opacity: 0.2,
    borderRadius: 33,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: '#1f2937',
  },
  searchButton: {
    padding: 8,
  },
  searchButtonText: {
    fontSize: 24,
  },
  recentContainer: {
    marginTop: 30,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentBubbles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recentBubble: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  recentBubbleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  tabsContainer: {
    marginTop: 40,
  },
  tabsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
  },
  tabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  homeErrorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
  },
  homeErrorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  autocompleteContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#fef3c7',
    marginTop: 10,
    textAlign: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  errorContainer: {
    padding: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    margin: 20,
    borderRadius: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: 10,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#fef3c7',
    textAlign: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageCard: {
    width: (width - 30) / 2,
    height: (width - 30) / 2,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingMoreText: {
    color: '#ffffff',
    fontSize: 16,
  },
  endOfResults: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  endOfResultsText: {
    color: '#fef3c7',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewerSafe: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 100,
  },
  closeViewerButton: {
    margin: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  imageCounter: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  imageCounterText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: '100%',
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  navButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeList: {
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3f4f6',
  },
  themePreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  themeCheckmark: {
    fontSize: 24,
    color: '#8b5cf6',
  },
  modalCloseButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});