import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Categories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const fetchCategories = async () => {
    try {
      const db = getFirestore();
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      const fetchedCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryPress = (category) => {
    if (selectedCategory && selectedCategory.id === category.id) {
      // If already selected, navigate to the category details
      router.push(`(screen)/test-list/${category.id}?name=${encodeURIComponent(category.name)}`);
    } else {
      // Just select the category
      setSelectedCategory(category);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.horizontalCard, selectedCategory?.id === item.id && styles.selectedCard]}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <Ionicons name="book-outline" size={20} color={selectedCategory?.id === item.id ? '#4F46E5' : '#666'} />
        <Text style={[
          styles.horizontalName,
          selectedCategory?.id === item.id && styles.selectedText
        ]}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        {/* Horizontal categories list */}
        <View style={styles.horizontalContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Vertical view when a category is selected */}
       
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
  },
  horizontalContainer: {
    height: 60,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  horizontalList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  horizontalCard: {
    width: 130,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectedCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  horizontalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 8,
  },
  selectedText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});