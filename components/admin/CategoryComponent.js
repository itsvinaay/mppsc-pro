import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';

const CategoryManagement = () => {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', isPaid: false });
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    try {
      const categoryData = {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        isPaid: newCategory.isPaid,
        active: true,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'categories'), categoryData);
      setNewCategory({ name: '', description: '', isPaid: false });
      fetchCategories();
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleEditCategory = async (category) => {
    if (editingCategory && editingCategory.id === category.id) {
      if (!editingCategory.name.trim()) {
        Alert.alert('Error', 'Category name is required');
        return;
      }

      try {
        await updateDoc(doc(db, 'categories', category.id), {
          name: editingCategory.name.trim(),
          description: editingCategory.description.trim(),
          isPaid: editingCategory.isPaid
        });
        setEditingCategory(null);
        fetchCategories();
        Alert.alert('Success', 'Category updated successfully');
      } catch (error) {
        console.error('Error updating category:', error);
        Alert.alert('Error', 'Failed to update category');
      }
    } else {
      setEditingCategory({ ...category, isPaid: category.isPaid || false });
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this category? This will also delete all associated tests and questions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'categories', categoryId));
              fetchCategories();
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
       
        {/* Add New Category Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add New Category</Text>
          <TextInput
            style={styles.input}
            placeholder="Category Name"
            value={newCategory.name}
            onChangeText={(text) => setNewCategory(prev => ({ ...prev, name: text }))}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={newCategory.description}
            onChangeText={(text) => setNewCategory(prev => ({ ...prev, description: text }))}
            multiline
          />
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Premium Content</Text>
            <Switch
              value={newCategory.isPaid}
              onValueChange={(value) => setNewCategory(prev => ({ ...prev, isPaid: value }))}
              trackColor={{ false: '#9ca3af', true: '#a5b4fc' }}
              thumbColor={newCategory.isPaid ? '#4f46e5' : '#f3f4f6'}
            />
          </View>
          <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleAddCategory}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.actionButtonTextPrimary}>Add Category</Text>
          </TouchableOpacity>
        </View>

        {/* Categories List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Categories ({categories.length})</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="hourglass-empty" size={24} color="#6b7280" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="category" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No categories yet</Text>
            </View>
          ) : (
            categories.map(category => (
              <View key={category.id} style={styles.categoryItem}>
                {editingCategory?.id === category.id ? (
                  <>
                    <TextInput
                      style={styles.input}
                      value={editingCategory.name}
                      onChangeText={(text) => setEditingCategory(prev => ({ ...prev, name: text }))}
                    />
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editingCategory.description}
                      onChangeText={(text) => setEditingCategory(prev => ({ ...prev, description: text }))}
                      multiline
                    />
                    <View style={styles.switchContainer}>
                      <Text style={styles.label}>Premium Content</Text>
                      <Switch
                        value={editingCategory.isPaid}
                        onValueChange={(value) => setEditingCategory(prev => ({ ...prev, isPaid: value }))}
                        trackColor={{ false: '#9ca3af', true: '#a5b4fc' }}
                        thumbColor={editingCategory.isPaid ? '#4f46e5' : '#f3f4f6'}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      {category.isPaid && (
                        <View style={styles.premiumBadge}>
                          <MaterialIcons name="star" size={16} color="#f59e0b" />
                          <Text style={styles.badgeText}>Premium</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.categoryDescription}>{category.description || 'No description'}</Text>
                    <Text style={styles.categoryMeta}>
                      Created: {new Date(category.createdAt).toLocaleDateString()}
                    </Text>
                  </>
                )}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditCategory(category)}
                  >
                    <MaterialIcons 
                      name={editingCategory?.id === category.id ? "save" : "edit"} 
                      size={20} 
                      color="#4f46e5" 
                    />
                    <Text style={styles.actionText}>
                      {editingCategory?.id === category.id ? 'Save' : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(category.id)}
                  >
                    <MaterialIcons name="delete" size={20} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4f46e5',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
});

export default CategoryManagement;