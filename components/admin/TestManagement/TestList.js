import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TestCard = ({ test, onManageQuestions, onDeleteTest, onEditTest }) => (
  <View style={styles.card}>
    <Text style={styles.testTitle}>{test.title}</Text>
    <Text style={styles.testDescription}>{test.description || 'No description'}</Text>
    <View style={styles.testInfo}>
      <Text style={styles.infoText}>Duration: {test.duration} min</Text>
      <Text style={styles.infoText}>Questions: {test.totalQuestions}</Text>
      <Text style={styles.infoText}>Date: {test.date?.toLocaleDateString?.() || 'Unknown'}</Text>
    </View>
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => onEditTest(test)}
      >
        <MaterialIcons name="edit" size={20} color="#4f46e5" />
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={onManageQuestions}
      >
        <MaterialIcons name="list" size={20} color="#10b981" />
        <Text style={[styles.actionText, { color: '#10b981' }]}>Questions</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={onDeleteTest}
      >
        <MaterialIcons name="delete" size={20} color="#ef4444" />
        <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const DateSelector = ({ selectedDate, onDateChange, onClose, isVisible }) => (
  <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.datePickerContainer}>
        <Text style={styles.modalTitle}>Select Date</Text>
        {Platform.OS === 'web' ? (
          <input 
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              onDateChange(new Date(e.target.value));
              onClose();
            }}
            style={{
              padding: 12,
              fontSize: 16,
              width: '100%',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}
          />
        ) : (
          <ScrollView style={styles.dateButtonsContainer}>
            {[...Array(7)].map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.dateOption}
                  onPress={() => {
                    onDateChange(date);
                    onClose();
                  }}
                >
                  <Text style={styles.dateOptionText}>
                    {date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </TouchableOpacity>
  </Modal>
);

const AddTestForm = ({ onAddTest, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    totalQuestions: '',
    date: new Date(),
  });
  const [showDateModal, setShowDateModal] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.duration || isNaN(formData.duration) || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Valid duration required';
    }
    if (!formData.totalQuestions || isNaN(formData.totalQuestions) || parseInt(formData.totalQuestions) <= 0) {
      newErrors.totalQuestions = 'Valid number required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onAddTest({
        ...formData,
        duration: parseInt(formData.duration),
        totalQuestions: parseInt(formData.totalQuestions)
      });
      setFormData({
        title: '',
        description: '',
        duration: '',
        totalQuestions: '',
        date: new Date(),
      });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Add New Test</Text>
      <TextInput
        style={[styles.input, errors.title && styles.inputError]}
        placeholder="Test Title *"
        value={formData.title}
        onChangeText={(text) => handleInputChange('title', text)}
      />
      {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={formData.description}
        onChangeText={(text) => handleInputChange('description', text)}
        multiline
      />
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <TextInput
            style={[styles.input, errors.duration && styles.inputError]}
            placeholder="Duration (min) *"
            value={formData.duration}
            onChangeText={(text) => handleInputChange('duration', text)}
            keyboardType="numeric"
          />
          {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
        </View>
        <View style={styles.inputHalf}>
          <TextInput
            style={[styles.input, errors.totalQuestions && styles.inputError]}
            placeholder="Questions *"
            value={formData.totalQuestions}
            onChangeText={(text) => handleInputChange('totalQuestions', text)}
            keyboardType="numeric"
          />
          {errors.totalQuestions && <Text style={styles.errorText}>{errors.totalQuestions}</Text>}
        </View>
      </View>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDateModal(true)}>
        <MaterialIcons name="event" size={20} color="#4f46e5" />
        <Text style={styles.dateButtonText}>{formData.date.toLocaleDateString()}</Text>
      </TouchableOpacity>
      <DateSelector
        selectedDate={formData.date}
        onDateChange={(date) => handleInputChange('date', date)}
        onClose={() => setShowDateModal(false)}
        isVisible={showDateModal}
      />
      <TouchableOpacity 
        style={styles.actionButtonPrimary} 
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.actionButtonTextPrimary}>Add Test</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const CategorySelector = ({ categories, selectedCategory, onSelectCategory, showAllCategories, onToggleShowAll }) => (
  <View style={styles.card}>
    <View style={styles.categoryHeader}>
      <Text style={styles.cardTitle}>Categories</Text>
      <TouchableOpacity onPress={onToggleShowAll}>
        <MaterialIcons 
          name={showAllCategories ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={24} 
          color="#6b7280" 
        />
      </TouchableOpacity>
    </View>
    <View style={[styles.categoryScroll, showAllCategories && styles.expandedScroll]}>
      <ScrollView
        horizontal={!showAllCategories}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.categoryRow, !showAllCategories && { flexWrap: 'nowrap' }]}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory?.id === category.id && styles.categoryChipSelected
              ]}
              onPress={() => onSelectCategory(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory?.id === category.id && styles.categoryChipTextSelected
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  </View>
);

const EditTestModal = ({ test, visible, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    totalQuestions: '',
    date: new Date(),
  });
  const [showDateModal, setShowDateModal] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (test) {
      setFormData({
        title: test.title || '',
        description: test.description || '',
        duration: test.duration?.toString() || '',
        totalQuestions: test.totalQuestions?.toString() || '',
        date: test.date || new Date(),
      });
    }
  }, [test]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.duration || isNaN(formData.duration) || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Valid duration required';
    }
    if (!formData.totalQuestions || isNaN(formData.totalQuestions) || parseInt(formData.totalQuestions) <= 0) {
      newErrors.totalQuestions = 'Valid number required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        ...formData,
        duration: parseInt(formData.duration),
        totalQuestions: parseInt(formData.totalQuestions)
      });
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Test</Text>
          <ScrollView>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Test Title *"
              value={formData.title}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, title: text }));
                if (errors.title) setErrors(prev => ({ ...prev, title: null }));
              }}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
            />
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <TextInput
                  style={[styles.input, errors.duration && styles.inputError]}
                  placeholder="Duration (min) *"
                  value={formData.duration}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, duration: text }));
                    if (errors.duration) setErrors(prev => ({ ...prev, duration: null }));
                  }}
                  keyboardType="numeric"
                />
                {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
              </View>
              <View style={styles.inputHalf}>
                <TextInput
                  style={[styles.input, errors.totalQuestions && styles.inputError]}
                  placeholder="Questions *"
                  value={formData.totalQuestions}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, totalQuestions: text }));
                    if (errors.totalQuestions) setErrors(prev => ({ ...prev, totalQuestions: null }));
                  }}
                  keyboardType="numeric"
                />
                {errors.totalQuestions && <Text style={styles.errorText}>{errors.totalQuestions}</Text>}
              </View>
            </View>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDateModal(true)}>
              <MaterialIcons name="event" size={20} color="#4f46e5" />
              <Text style={styles.dateButtonText}>{formData.date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <DateSelector
              selectedDate={formData.date}
              onDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
              onClose={() => setShowDateModal(false)}
              isVisible={showDateModal}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}>
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButtonPrimary} 
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Tests = () => {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTest, setEditingTest] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(category => category.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      setCategories(categoriesData);
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0]);
        fetchTests(categoriesData[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
      setLoading(false);
    }
  };

  const fetchTests = async (categoryId) => {
    setLoading(true);
    try {
      const testsQuery = query(
        collection(db, `categories/${categoryId}/tests`),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(testsQuery);
      const testsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      }));
      setTests(testsData);
    } catch (error) {
      console.error('Error fetching tests:', error);
      Alert.alert('Error', 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = useCallback((category) => {
    setSelectedCategory(category);
    fetchTests(category.id);
  }, []);

  const handleAddTest = async (testData) => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    setSubmitting(true);
    try {
      const testRef = await addDoc(collection(db, `categories/${selectedCategory.id}/tests`), {
        ...testData,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        title: 'New Test Announced',
        message: `${testData.title} is scheduled for ${testData.date.toLocaleDateString()}. ${testData.description}`,
        createdAt: serverTimestamp(),
        read: false,
        type: 'test',
        testDate: testData.date,
        categoryId: selectedCategory.id,
        testId: testRef.id,
      });
      setTests(prev => [{
        id: testRef.id,
        ...testData,
        createdAt: new Date()
      }, ...prev]);
      Alert.alert('Success', 'Test added and notification sent');
    } catch (error) {
      console.error('Error adding test:', error);
      Alert.alert('Error', 'Failed to add test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this test?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, `categories/${selectedCategory.id}/tests`, testId));
              setTests(prev => prev.filter(test => test.id !== testId));
              Alert.alert('Success', 'Test deleted successfully');
            } catch (error) {
              console.error('Error deleting test:', error);
              Alert.alert('Error', 'Failed to delete test');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleManageQuestions = (testId) => {
    router.push({
      pathname: '/questions',
      params: { categoryId: selectedCategory.id, testId }
    });
  };

  const handleEditTest = async (updatedTestData) => {
    if (!selectedCategory || !editingTest) return;
    setSubmitting(true);
    try {
      const testRef = doc(db, `categories/${selectedCategory.id}/tests`, editingTest.id);
      await updateDoc(testRef, {
        ...updatedTestData,
        updatedAt: serverTimestamp(),
      });
      setTests(prev => prev.map(test => 
        test.id === editingTest.id ? { ...test, ...updatedTestData, updatedAt: new Date() } : test
      ));
      setEditModalVisible(false);
      setEditingTest(null);
      Alert.alert('Success', 'Test updated successfully');
    } catch (error) {
      console.error('Error updating test:', error);
      Alert.alert('Error', 'Failed to update test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <CategorySelector
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          showAllCategories={showAllCategories}
          onToggleShowAll={() => setShowAllCategories(!showAllCategories)}
        />
        <AddTestForm onAddTest={handleAddTest} isLoading={submitting} />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tests ({tests.length})</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <MaterialIcons name="hourglass-empty" size={24} color="#6b7280" />
              <Text style={styles.loadingText}>Loading tests...</Text>
            </View>
          ) : tests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No tests yet</Text>
            </View>
          ) : (
            tests.map(test => (
              <TestCard 
                key={test.id}
                test={test}
                onManageQuestions={() => handleManageQuestions(test.id)}
                onDeleteTest={() => handleDeleteTest(test.id)}
                onEditTest={(test) => {
                  setEditModalVisible(true);
                  setEditingTest(test);
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
      <EditTestModal
        test={editingTest}
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingTest(null);
        }}
        onSave={handleEditTest}
        isLoading={submitting}
      />
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
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  testInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
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
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1f2937',
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  expandedScroll: {
    maxHeight: 200,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  categoryChipSelected: {
    backgroundColor: '#4f46e5',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  dateButtonsContainer: {
    maxHeight: 300,
    gap: 8,
  },
  dateOption: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalButtonSecondary: {
    padding: 10,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  modalButtonPrimary: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Tests;