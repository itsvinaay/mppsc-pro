import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

export default function UploadBook() {
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [books, setBooks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    if (status) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setStatus(null));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  const fetchBooks = async () => {
    try {
      const booksSnapshot = await getDocs(collection(db, 'books'));
      const booksData = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksData);

      // Extract unique categories
      const uniqueCategories = [...new Set(booksData.map(book => book.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching books:', error);
      Alert.alert('Error', 'Failed to fetch books');
    }
  };

  const handleUpload = async () => {
    if (!bookTitle || !bookAuthor || !bookUrl || !category) {
      Alert.alert('Error', 'Please fill all fields');
      setStatus('error');
      return;
    }

    if (!bookUrl.startsWith('https://')) {
      Alert.alert('Error', 'Please enter a valid HTTPS URL');
      setStatus('error');
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      await addDoc(collection(db, 'books'), {
        title: bookTitle,
        author: bookAuthor,
        category,
        fileUrl: bookUrl,
        uploadedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        title: 'New Study Material Available',
        message: `A new book "${bookTitle}" by ${bookAuthor} has been added to ${category} category.`,
        createdAt: serverTimestamp(),
        read: false,
        type: 'book',
      });

      setStatus('success');
      setBookTitle('');
      setBookAuthor('');
      setBookUrl('');
      setCategory('');
      fetchBooks(); // Refresh books list
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      Alert.alert('Error', 'Failed to add book. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (bookId) => {
    try {
      await deleteDoc(doc(db, 'books', bookId));
      setStatus('deleted');
      fetchBooks(); // Refresh books list
    } catch (error) {
      console.error('Delete error:', error);
      setStatus('error');
      Alert.alert('Error', 'Failed to delete book');
    }
  };

  const getFilteredBooks = () => {
    if (selectedCategory === 'all') return books;
    return books.filter(book => book.category === selectedCategory);
  };

  return (
    <View style={styles.container}>
       {status && (
          <Animated.View 
            style={[styles.statusContainer, { 
              opacity: fadeAnim,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: [{ translateX: -100 }, { translateY: -25 }],
              zIndex: 999,
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              shtextShadow: '-1px 1px 10px rgba(0, 0, 0, 0.75)',
              elevation: 5,
            }]}
          >
            <MaterialIcons 
              name={status === 'success' ? 'check-circle' : status === 'deleted' ? 'delete-forever' : 'error'} 
              size={24} 
              color={status === 'success' ? '#4CAF50' : status === 'deleted' ? '#FF9800' : '#F44336'}
            />
            <Text style={[styles.statusText, {
              color: status === 'success' ? '#4CAF50' : status === 'deleted' ? '#FF9800' : '#F44336',
              marginLeft: 8
            }]}>
              {status === 'success' ? 'Book added successfully!' : 
               status === 'deleted' ? 'Book deleted successfully!' :
               'Failed to add book'}
            </Text>
          </Animated.View>
        )}
      <ScrollView style={styles.form}>
       

        <TextInput
          style={styles.input}
          placeholder="Book Title"
          value={bookTitle}
          onChangeText={setBookTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Author Name"
          value={bookAuthor}
          onChangeText={setBookAuthor}
        />

        <TextInput
          style={styles.input}
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
        />

        <TextInput
          style={styles.input}
          placeholder="Book URL (HTTPS)"
          value={bookUrl}
          onChangeText={setBookUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Add Book</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.categoryWrapper}>
          <View style={styles.categoryHeader}>
            <ScrollView
              horizontal={!showAllCategories}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={[styles.categoryScroll, showAllCategories && styles.expandedScroll]}
            >
              <View style={[styles.categoryRow, !showAllCategories && { flexWrap: 'nowrap' }]}>
                <TouchableOpacity 
                  style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextSelected]}>All</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat}
                    style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
          </View>
        </View>

        <View style={styles.booksList}>
          {getFilteredBooks().map(book => (
            <View key={book.id} style={styles.bookCard}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>by {book.author}</Text>
                <Text style={styles.bookCategory}>Category: {book.category}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDelete(book.id)}
              >
                <MaterialIcons name="delete" size={24} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
 textShadow: '-1px 1px 10px rgba(0, 0, 0, 0.75)'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginTop: 8,
    marginBottom: 10,
  },
  categoryHeader: {
    position: 'relative',
    width: '100%',
  },
  categoryScroll: {
       width: width - 40,
    maxHeight: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  expandedScroll: {
    maxHeight: 200,
  },
  categoryRow: {
      flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 0,
    paddingRight: 40,
  },
  toggleButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  categoryChip: {
   paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
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
    marginTop: 20,
  },
  bookCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bookCategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  }
});