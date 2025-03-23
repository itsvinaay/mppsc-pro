import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Linking,
  Dimensions,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, where, getDoc, Query } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import ThreeDotsLoader from '../../../components/ThreeDotsLoader';
import BookDetailsModal from '../../../components/BookDetailsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Create FavoritesContext type to fix missing module
import { createContext } from 'react';
import { FavoritesContext } from '../../../context/FavoritesContext';


// Types
interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description?: string;
  url?: string;  // Make url optional by adding '?'
  uploadedAt: {
    toDate: () => Date;
  };
}

interface FavoritesContextType {
  favorites: Book[];
  toggleFavorite: (book: Book) => void;
}

const { width } = Dimensions.get('window');

const Book: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const { favorites, toggleFavorite } = useContext(FavoritesContext) as FavoritesContextType;
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  const [openedBooks, setOpenedBooks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBooks();
    if (auth.currentUser) {
      loadUserFavorites();
    }
    loadOpenedBooks();
  }, []);

  const loadBooks = async (): Promise<void> => {
    try {
      setLoading(true);
      const q: Query = query(collection(db, 'books'), orderBy('uploadedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const booksData: Book[] = [];
      const categoriesSet = new Set<string>();
      categoriesSet.add('All');

      querySnapshot.forEach((doc) => {
        const book = { id: doc.id, ...doc.data() } as Book;
        booksData.push(book);
        if (book.category) {
          categoriesSet.add(book.category);
        }
      });

      setBooks(booksData);
      setCategories(Array.from(categoriesSet));
    } catch (error) {
      console.error('Error loading books:', error);
      Alert.alert('Error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const loadUserFavorites = async (): Promise<void> => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const favoriteBooksArray = userDoc.data().favoriteBooks || [];
        console.log('Loaded favorites:', favoriteBooksArray);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      Alert.alert('Error', 'Failed to load favorites');
    }
  };

  const loadOpenedBooks = async (): Promise<void> => {
    try {
      const opened = await AsyncStorage.getItem('openedBooks');
      if (opened) {
        setOpenedBooks(new Set(JSON.parse(opened)));
      }
    } catch (error) {
      console.error('Error loading opened books:', error);
    }
  };

  const markBookAsOpened = async (bookId: string): Promise<void> => {
    try {
      const newOpenedBooks = new Set(openedBooks);
      newOpenedBooks.add(bookId);
      setOpenedBooks(newOpenedBooks);
      await AsyncStorage.setItem('openedBooks', JSON.stringify([...newOpenedBooks]));
    } catch (error) {
      console.error('Error marking book as opened:', error);
    }
  };

  const handleBookPress = (book: Book): void => {
    markBookAsOpened(book.id);
    setSelectedBook(book);
    setShowDetailsModal(true);
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSearch = (): void => {
    setShowSearch(true);
    setShowFilter(false);
    setShowOptions(false);
  };

  const handleSort = (type: string): void => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
    setShowFilter(false);
    setShowOptions(false);
  };

  const filteredBooks = useMemo<Book[]>(() => {
    if (selectedCategory === 'Favorites' || showFavorites) {
      return books.filter(book => favorites.some(fav => fav.id === book.id));
    }

    return selectedCategory === 'All'
      ? books.filter(book =>
          searchQuery
            ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              book.author.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        )
      : books.filter(book =>
          book.category === selectedCategory &&
          (searchQuery
            ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              book.author.toLowerCase().includes(searchQuery.toLowerCase())
            : true)
        );
  }, [books, selectedCategory, searchQuery, favorites, showFavorites]);

  const sortedBooks = useMemo<Book[]>(() => {
    return [...filteredBooks].sort((a: Book, b: Book) => {
      switch (sortBy) {
        case 'title':
          return sortOrder === 'desc'
            ? b.title.localeCompare(a.title)
            : a.title.localeCompare(b.title);
        case 'author':
          return sortOrder === 'desc'
            ? b.author.localeCompare(a.author)
            : a.author.localeCompare(b.author);
       // ... existing code ...
       case 'date':
        return sortOrder === 'desc'
          ? b.uploadedAt.toDate().getTime() - a.uploadedAt.toDate().getTime()
          : a.uploadedAt.toDate().getTime() - b.uploadedAt.toDate().getTime();
      default:
          return 0;
      }
    });
  }, [filteredBooks, sortBy, sortOrder]);

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }, []);

  const markAllAsRead = (): void => {
    setShowOptions(false);
    Alert.alert(
      'Mark All Books',
      'Would you like to mark all books as read?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Mark as Read',
          onPress: () => {
            Alert.alert(
              'Success',
              'All books have been marked as read',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const deleteAllNotifications = (): void => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete all books?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Info',
              'Delete operation is not permitted for books',
              [{ text: 'OK' }]
            );
            setShowOptions(false);
          }
        }
      ]
    );
  };

  const isNewBook = (uploadedAt: any, bookId: string): boolean => {
    if (!uploadedAt || openedBooks.has(bookId)) {
      return false;
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const uploadDate = uploadedAt.toDate();
      return uploadDate > sevenDaysAgo;
    } catch (error) {
      console.error('Error checking if book is new:', error);
      return false;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThreeDotsLoader color="#FF5733" size={12} />
      </View>
    );
  }

  const mainCategories = categories.slice(0, 3);
  const extraCategories = categories.slice(3);

  return (
    <View style={styles.container}>
      <View style={styles.categoryWrapper}>
        {books.length > 0 && (
          <>
            <View style={styles.optionsHeader}>
              {showSearch ? (
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search books..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Text style={styles.searchCount}>
                      {filteredBooks.length} found
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setSearchQuery('');
                      setShowSearch(false);
                    }}
                  >
                    <MaterialIcons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.leftActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, showSearch && styles.actionButtonActive]}
                      onPress={handleSearch}
                    >
                      <MaterialIcons 
                        name="search" 
                        size={24} 
                        color={showSearch ? "#FFFFFF" : "#2563EB"}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.rightActions}>
                     
                    <View style={styles.rightButtonsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          showFavorites && styles.actionButtonActive,
                          { position: 'relative' }  // Add this to support badge
                        ]}
                        onPress={() => {
                          setShowFavorites(!showFavorites);
                          setShowFilter(false);
                          setShowOptions(false);
                        }}
                      >
                        <MaterialIcons 
                          name="favorite" 
                          size={24} 
                          color={showFavorites ? "#FFFFFF" : "#2563EB"}
                        />
                        {favorites.length > 0 && (
                          <View style={styles.favoriteBadge}>
                            <Text style={styles.favoriteBadgeText}>
                              {favorites.length}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, showFilter && styles.actionButtonActive]}
                        onPress={() => {
                          setShowFilter(!showFilter);
                          setShowOptions(false);
                        }}
                      >
                        <MaterialIcons 
                          name="sort" 
                          size={24} 
                          color={showFilter ? "#FFFFFF" : "#2563EB"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, showOptions && styles.actionButtonActive]}
                        onPress={() => {
                          setShowOptions(!showOptions);
                          setShowFilter(false);
                        }}
                      >
                        <MaterialIcons 
                          name="more-vert" 
                          size={24} 
                          color={showOptions ? "#FFFFFF" : "#2563EB"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>


            {showFilter && (
              <>
                <TouchableOpacity
                  style={styles.overlay}
                  onPress={() => setShowFilter(false)}
                />
                <View style={styles.filterMenu}>
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSort('date')}
                  >
                    <MaterialIcons 
                      name={sortBy === 'date' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'schedule'} 
                      size={20} 
                      color="#2196F3" 
                    />
                    <Text style={styles.optionText}>Date</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSort('title')}
                  >
                    <MaterialIcons 
                      name={sortBy === 'title' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'sort-by-alpha'} 
                      size={20} 
                      color="#2196F3" 
                    />
                    <Text style={styles.optionText}>Title</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => handleSort('author')}
                  >
                    <MaterialIcons 
                      name={sortBy === 'author' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'person'} 
                      size={20} 
                      color="#2196F3" 
                    />
                    <Text style={styles.optionText}>Author</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

{showOptions && (
            <>
              <TouchableOpacity
                style={styles.overlay}
                onPress={() => setShowOptions(false)}
              />
              <View style={styles.optionsMenu}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={markAllAsRead}
                >
                  <MaterialIcons name="check" size={20} color="#2196F3" />
                  <Text style={styles.optionText}>Mark all as read</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={deleteAllNotifications}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                  <Text style={styles.optionText}>Delete all</Text>
                </TouchableOpacity>

                <View style={{
                  height: 1,
                  backgroundColor: '#E2E8F0',
                  marginVertical: 8
                }} />

                <Text style={{
                  fontSize: 14,
                  color: '#64748B',
                  fontWeight: '500',
                  marginVertical: 8,
                  paddingHorizontal: 12
                }}>Sort by</Text>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('date')}
                >
                  <MaterialIcons 
                    name={sortBy === 'date' ? (sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward') : 'schedule'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Date</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('priority')}
                >
                  <MaterialIcons 
                    name={sortBy === 'priority' ? (sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward') : 'priority-high'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Priority</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('type')}
                >
                  <MaterialIcons 
                    name={sortBy === 'type' ? (sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward') : 'sort'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Type</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </>
        )}
        <View style={styles.categoryHeader}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mainCategoryRow}
            data={[ ...mainCategories]}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === item && styles.categoryChipSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(item);
                  setShowAllCategories(false);
                  setShowFavorites(false);
                }}
              >
                <Text 
                  style={[
                    styles.categoryChipText,
                    selectedCategory === item && styles.categoryChipTextSelected
                  ]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />

          {showAllCategories && extraCategories.length > 0 && (
            <ScrollView
              style={styles.extraCategoriesScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.extraCategoriesRow}>
                {extraCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text 
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextSelected
                      ]}
                      numberOfLines={1}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {categories.length > 3 && (
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowAllCategories(!showAllCategories)}
            >
              <MaterialIcons 
                name={showAllCategories ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={24} 
                color="#666" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={sortedBooks}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.booksContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={selectedCategory === 'Favorites' ? "favorite-border" : "library-books"} 
              size={48} 
              color="#CBD5E1" 
            />
            <Text style={styles.emptyStateText}>
              {selectedCategory === 'Favorites' 
                ? 'No favorite books yet. Tap the heart icon on any book to add it to your favorites.'
                : 'No books found'}
            </Text>
          </View>
        )}
        renderItem={({ item: book }) => {
          const isNew = isNewBook(book.uploadedAt, book.id);
          console.log('Rendering book:', {
            title: book.title,
            uploadedAt: book.uploadedAt,
            isNew
          });
          
          return (
            <TouchableOpacity
              key={book.id}
              style={styles.bookCard}
              onPress={() => handleBookPress(book)}
            >
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.favoriteIcon}
                onPress={() => toggleFavorite(book)}
              >
                <MaterialIcons
                  name={favorites.some(fav => fav.id === book.id) ? "favorite" : "favorite-border"}
                  size={24}
                  color={favorites.some(fav => fav.id === book.id) ? "#E53935" : "#666"}
                />
              </TouchableOpacity>
              <View style={styles.bookIcon}>
                <MaterialIcons name="picture-as-pdf" size={32} color="#E53935" />
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
                <View style={styles.bookMeta}>
                  <Text style={styles.uploadDate}>
                    {formatDate(book.uploadedAt)}
                  </Text>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText} numberOfLines={1} ellipsizeMode="tail">
                      {book.category}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <BookDetailsModal 
        book={selectedBook}
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBook(null);
        }}
      />
    </View>
  );
};

// Define StyleSheet types
interface Styles {
  container: ViewStyle;
  loadingContainer: ViewStyle;
  categoryWrapper: ViewStyle;
  categoryHeader: ViewStyle;
  mainCategoryRow: ViewStyle;
  extraCategoriesScroll: ViewStyle;
  extraCategoriesRow: ViewStyle;
  toggleButton: ViewStyle;
  categoryChip: ViewStyle;
  categoryChipSelected: ViewStyle;
  categoryChipText: TextStyle;
  categoryChipTextSelected: TextStyle;
  booksList: ViewStyle;
  booksContainer: ViewStyle;
  booksGrid: ViewStyle;
  bookCard: ViewStyle;
  bookIcon: ViewStyle;
  bookInfo: ViewStyle;
  bookTitle: TextStyle;
  bookAuthor: TextStyle;
  bookMeta: ViewStyle;
  uploadDate: TextStyle;
  categoryTag: ViewStyle;
  categoryTagText: TextStyle;
  emptyState: ViewStyle;
  emptyStateText: TextStyle;
  optionsHeader: ViewStyle;
  leftActions: ViewStyle;
  rightActions: ViewStyle;
  rightButtonsContainer: ViewStyle;
  actionButton: ViewStyle;
  actionButtonActive: ViewStyle;
  overlay: ViewStyle;
  filterMenu: ViewStyle;
  optionItem: ViewStyle;
  optionText: TextStyle;
  optionsMenu: ViewStyle;
  searchContainer: ViewStyle;
  searchInput: TextStyle;
  searchCount: TextStyle;
  clearButton: ViewStyle;
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalBody: ViewStyle;
  bookDetailCard: ViewStyle;
  bookIconLarge: ViewStyle;
  detailsSection: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  actionButtons: ViewStyle;
  actionButtonText: TextStyle;
  favoriteIcon: ViewStyle;
  favoriteBadge: ViewStyle;
  favoriteBadgeText: TextStyle;
  newBadge: ViewStyle;
  newBadgeText: TextStyle;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  categoryWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 998,
  },
  categoryHeader: {
    position: 'relative',
    width: '100%',
  },
  mainCategoryRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  extraCategoriesScroll: {
    maxHeight: 150,
  },
  extraCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  toggleButton: {
    position: 'absolute',
    right: 8,
    top: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: (width - 96) / 3,
    maxWidth: (width - 96) / 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFF',
  },
  booksList: {
    flex: 1,
  },
  booksContainer: {
    // padding: 8,
    paddingBottom: 10,
    gap: 2,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bookCard: {
    width: (width - 32) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    margin: 8,
    height: 240,
  },
  bookIcon: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    lineHeight: 20,
    maxHeight: 40,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  uploadDate: {
    fontSize: 11,
    color: '#888',
  },
  categoryTag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '50%',
  },
  categoryTagText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
  },
  actionButtonActive: {
    backgroundColor: '#2563EB',
  },
  overlay: {
    position: 'absolute',
    top: -100,
    left: 0,
    right: 0,
    bottom: -100,
    zIndex: 999,
  },
  filterMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 180,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  optionText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  optionsMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 180,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    fontSize: 14,
  },
  searchCount: {
    color: '#666',
    fontSize: 12,
    marginLeft: 8,
  },
  clearButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalBody: {
    padding: 16,
  },
  bookDetailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookIconLarge: {
    width: '100%',
    height: 200,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  // actionButton: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   padding: 8,
  //   borderRadius: 8,
  //   backgroundColor: '#F1F5F9',
  // },
  actionButtonText: {
    marginLeft: 8,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 4,
  },
  favoriteBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#E53935',
    borderRadius: 14,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  favoriteBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22C55E',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Book;