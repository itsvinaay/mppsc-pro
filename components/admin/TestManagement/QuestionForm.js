import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import ThreeDotsLoader from '../../ThreeDotsLoader';

const QuestionManagement = () => {
  const router = useRouter();
  
  const [categories, setCategories] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: null
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [textFileLoading, setTextFileLoading] = useState(false);
  const [isSelectionCardVisible, setIsSelectionCardVisible] = useState(true);
  const [slideAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTests();
      setSelectedTest(null);
      setQuestions([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTest) {
      fetchQuestions();
    }
  }, [selectedTest]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    if (!selectedCategory) return;
    try {
      const querySnapshot = await getDocs(
        collection(db, `categories/${selectedCategory.id}/tests`)
      );
      const testsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTests(testsData);
    } catch (error) {
      console.error('Error fetching tests:', error);
      Alert.alert('Error', 'Failed to load tests');
    }
  };

  const fetchQuestions = async () => {
    if (!selectedCategory || !selectedTest) return;
    try {
      const querySnapshot = await getDocs(
        collection(db, `categories/${selectedCategory.id}/tests/${selectedTest.id}/questions`)
      );
      const questionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching questions:', error);
      Alert.alert('Error', 'Failed to load questions');
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedCategory || !selectedTest) {
      Alert.alert('Error', 'Please select a category and test first');
      return;
    }

    if (!newQuestion.question.trim()) {
      Alert.alert('Error', 'Question text is required');
      return;
    }

    if (newQuestion.options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'All options must be filled');
      return;
    }

    if (newQuestion.correctAnswer === null) {
      Alert.alert('Error', 'Please select a correct answer');
      return;
    }

    if (questions.length >= selectedTest.totalQuestions) {
      Alert.alert('Error', `Maximum questions limit (${selectedTest.totalQuestions}) reached`);
      return;
    }

    try {
      await addDoc(
        collection(db, `categories/${selectedCategory.id}/tests/${selectedTest.id}/questions`),
        {
          question: newQuestion.question.trim(),
          options: newQuestion.options.map(opt => opt.trim()),
          correctAnswer: newQuestion.correctAnswer
        }
      );

      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: null
      });

      await fetchQuestions();
      Alert.alert('Success', 'Question added successfully');
    } catch (error) {
      console.error('Error adding question:', error);
      Alert.alert('Error', 'Failed to add question');
    }
  };

  const handleEditQuestion = async () => {
    if (!editingQuestion || !selectedCategory || !selectedTest) {
      Alert.alert('Error', 'Invalid selection or no question being edited');
      return;
    }

    if (!newQuestion.question.trim()) {
      Alert.alert('Error', 'Question text is required');
      return;
    }
    if (newQuestion.options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'All options must be filled');
      return;
    }
    if (newQuestion.correctAnswer === null) {
      Alert.alert('Error', 'Please select a correct answer');
      return;
    }

    try {
      const questionRef = doc(
        db,
        `categories/${selectedCategory.id}/tests/${selectedTest.id}/questions`,
        editingQuestion.id
      );

      await updateDoc(questionRef, {
        question: newQuestion.question.trim(),
        options: newQuestion.options.map(opt => opt.trim()),
        correctAnswer: newQuestion.correctAnswer
      });

      setEditingQuestion(null);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: null
      });
      
      await fetchQuestions();
      Alert.alert('Success', 'Question updated successfully');
    } catch (error) {
      console.error('Error updating question:', error);
      Alert.alert('Error', `Failed to update question: ${error.message}`);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, `categories/${selectedCategory.id}/tests/${selectedTest.id}/questions/${questionId}`)
              );
              await fetchQuestions();
              Alert.alert('Success', 'Question deleted successfully');
            } catch (error) {
              console.error('Error deleting question:', error);
              Alert.alert('Error', 'Failed to delete question');
            }
          }
        }
      ]
    );
  };

  const startEditing = (question) => {
    setEditingQuestion(question);
    setNewQuestion({
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer
    });
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
    setNewQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: null
    });
  };

  const renderPreviewMode = () => {
    return (
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Test Preview</Text>
          <TouchableOpacity 
            style={styles.closePreviewButton}
            onPress={() => setShowPreview(false)}
          >
            <Text style={styles.closePreviewText}>Close Preview</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.previewContent}>
          {questions.map((question, index) => (
            <View key={question.id} style={styles.previewQuestion}>
              <Text style={styles.previewQuestionNumber}>Question {index + 1}</Text>
              <Text style={styles.previewQuestionText}>{question.question}</Text>
              
              {question.options.map((option, optIndex) => (
                <TouchableOpacity 
                  key={optIndex}
                  style={[
                    styles.previewOption,
                    question.correctAnswer === optIndex && styles.previewCorrectOption
                  ]}
                >
                  <Text style={[
                    styles.previewOptionText,
                    question.correctAnswer === optIndex && styles.previewCorrectOptionText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const handleTextFileUpload = async () => {
    try {
      if (!selectedCategory || !selectedTest) {
        Alert.alert('Error', 'Please select a category and test first');
        return;
      }
  
      setTextFileLoading(true);
  
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
      });
  
      if (!result.assets || !result.assets[0]) {
        setTextFileLoading(false);
        return;
      }
  
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsedQuestions = parseQuestions(fileContent);
  
      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found in the file');
      }
  
      const remainingSlots = selectedTest.totalQuestions - questions.length;
      
      if (remainingSlots <= 0) {
        throw new Error('This test has reached its maximum question limit');
      }
      
      if (parsedQuestions.length > remainingSlots) {
        Alert.alert(
          'Too Many Questions',
          `This test can only accept ${remainingSlots} more question${remainingSlots === 1 ? '' : 's'}. Would you like to import the first ${remainingSlots} question${remainingSlots === 1 ? '' : 's'}?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setTextFileLoading(false)
            },
            {
              text: 'Import',
              onPress: async () => {
                const questionsToUpload = parsedQuestions.slice(0, remainingSlots);
                await uploadQuestions(questionsToUpload);
                setTextFileLoading(false);
                Alert.alert('Success', `${questionsToUpload.length} question${questionsToUpload.length === 1 ? '' : 's'} imported successfully`);
              }
            }
          ]
        );
      } else {
        await uploadQuestions(parsedQuestions);
        setTextFileLoading(false);
        Alert.alert('Success', `${parsedQuestions.length} question${parsedQuestions.length === 1 ? '' : 's'} imported successfully`);
      }
  
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', error.message || 'Failed to process file');
      setTextFileLoading(false);
    }
  };
  
  const parseQuestions = (text) => {
    const questions = [];
    const blocks = text.split(/[Qqप्र]\d+\./);
    
    for (let block of blocks) {
      try {
        if (!block.trim()) continue;
        const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length < 6) continue;

        const question = {
          question: lines[0],
          options: [],
          correctAnswer: null
        };

        const optionLines = lines.filter(line => /^[a-dक-घ][)\॰]/.test(line));
        if (optionLines.length !== 4) continue;

        question.options = optionLines.map(line => 
          line.replace(/^[a-dक-घ][)\॰]\s*/, '').trim()
        );

        const answerLine = lines.find(line => 
          line.toLowerCase().includes('correct answer:') || 
          line.includes('सही उत्तर:')
        );

        if (answerLine) {
          const answer = answerLine.toLowerCase().match(/[a-dक-घ]/)?.[0];
          if (answer) {
            if (answer >= 'a' && answer <= 'd') {
              question.correctAnswer = answer.charCodeAt(0) - 97;
            } else {
              const devanagariIndex = ['क', 'ख', 'ग', 'घ'].indexOf(answer);
              if (devanagariIndex !== -1) {
                question.correctAnswer = devanagariIndex;
              }
            }
          }
        }

        if (question.question && 
            question.options.length === 4 && 
            question.correctAnswer !== null) {
          questions.push(question);
        }
      } catch (error) {
        console.warn('Error parsing question block:', error);
      }
    }
    
    return questions;
  };

  const uploadQuestions = async (questions) => {
    if (!selectedCategory || !selectedTest) return;
    
    for (const question of questions) {
      await addDoc(
        collection(db, `categories/${selectedCategory.id}/tests/${selectedTest.id}/questions`),
        question
      );
    }
    await fetchQuestions();
  };

  const renderCategoryDropdown = () => (
    <Modal
      visible={showCategoryDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCategoryDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCategoryDropdown(false)}
      >
        <View style={[styles.modalContent, { top: 150 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTestDropdown = () => (
    <Modal
      visible={showTestDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTestDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTestDropdown(false)}
      >
        <View style={[styles.modalContent, { top: 220 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {tests.map(test => (
              <TouchableOpacity
                key={test.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedTest(test);
                  setShowTestDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>{test.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
       <ThreeDotsLoader />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerToggle}
          onPress={() => setIsSelectionCardVisible(!isSelectionCardVisible)}
        >
          <View style={styles.headerContent}>
            <Text style={styles.titleText}>Category</Text>
            <View style={styles.headerRight}>
              {!isSelectionCardVisible && selectedCategory && (
                <Text style={styles.selectedText} numberOfLines={1}>
                  {selectedCategory.name} {selectedTest ? `- ${selectedTest.title}` : ''}
                </Text>
              )}
              <MaterialIcons 
                name={isSelectionCardVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                size={24} 
                color="#666" 
              />
            </View>
          </View>
        </TouchableOpacity>

        {isSelectionCardVisible && (
          <View style={styles.selectionCard}>
            <View style={styles.selectorWrapper}>
              <Text style={styles.selectorLabel}>Select Category</Text>
              <TouchableOpacity 
                style={styles.selector}
                onPress={() => {
                  setShowCategoryDropdown(true);
                  setShowTestDropdown(false);
                }}
              >
                <Text style={styles.selectorText}>
                  {selectedCategory?.name || 'Choose a category'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectorWrapper}>
              <Text style={styles.selectorLabel}>Select Test</Text>
              <TouchableOpacity 
                style={[styles.selector, !selectedCategory && styles.selectorDisabled]}
                onPress={() => {
                  if (selectedCategory) {
                    setShowTestDropdown(true);
                    setShowCategoryDropdown(false);
                  }
                }}
              >
                <Text style={[styles.selectorText, !selectedCategory && styles.selectorTextDisabled]}>
                  {selectedTest?.title || 'Choose a test'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedTest && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  Questions: {questions.length} / {selectedTest.totalQuestions}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {selectedTest && !showPreview && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.previewButton}
              onPress={() => setShowPreview(true)}
            >
              <Text style={styles.previewButtonText}>Preview Test</Text>
            </TouchableOpacity>
          </View>
        )}

        {showPreview ? (
          renderPreviewMode()
        ) : (
          <>
            {selectedTest && (
              <View style={styles.addQuestionCard}>
                <Text style={styles.cardTitle}>
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </Text>

                <TouchableOpacity 
                  style={styles.textUploadButton}
                  onPress={handleTextFileUpload}
                  disabled={textFileLoading}
                >
                  <Text style={styles.textUploadButtonText}>
                    {textFileLoading ? 'Processing...' : 'Upload Questions from Text File'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.orDivider}>- OR -</Text>

                <TextInput
                  style={styles.questionInput}
                  placeholder="Enter your question here"
                  value={newQuestion.question}
                  onChangeText={(text) => setNewQuestion(prev => ({ ...prev, question: text }))}
                  multiline
                />

                <View style={styles.optionsContainer}>
                  {newQuestion.options.map((option, index) => (
                    <View key={index} style={styles.optionWrapper}>
                      <TextInput
                        style={[
                          styles.optionInput,
                          newQuestion.correctAnswer === index && styles.correctOptionInput
                        ]}
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChangeText={(text) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = text;
                          setNewQuestion(prev => ({ ...prev, options: newOptions }));
                        }}
                      />
                      <TouchableOpacity
                        style={[
                          styles.correctButton,
                          newQuestion.correctAnswer === index && styles.correctButtonSelected
                        ]}
                        onPress={() => setNewQuestion(prev => ({ ...prev, correctAnswer: index }))}
                      >
                        <Text style={[
                          styles.correctButtonText,
                          newQuestion.correctAnswer === index && styles.correctButtonTextSelected
                        ]}>
                          Correct
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.formButtons}>
                  {editingQuestion ? (
                    <>
                      <TouchableOpacity 
                        style={[styles.formButton, styles.updateButton]} 
                        onPress={handleEditQuestion}
                      >
                        <Text style={styles.buttonText}>Update Question</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.formButton, styles.cancelButton]} 
                        onPress={cancelEditing}
                      >
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.formButton, styles.addButton]} 
                      onPress={handleAddQuestion}
                    >
                      <Text style={styles.buttonText}>Add Question</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {selectedTest && questions.length > 0 && (
              <View style={styles.questionsListCard}>
                <Text style={styles.cardTitle}>Existing Questions</Text>
                {questions.map((question, index) => (
                  <View key={question.id} style={styles.questionItem}>
                    <Text style={styles.questionNumber}>Question {index + 1}</Text>
                    <Text style={styles.questionText}>{question.question}</Text>
                    
                    {question.options.map((option, optIndex) => (
                      <View 
                        key={optIndex} 
                        style={[
                          styles.optionItem,
                          question.correctAnswer === optIndex && styles.correctOptionItem
                        ]}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </View>
                    ))}
                    
                    <View style={styles.questionActions}>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => startEditing(question)}
                      >
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteQuestion(question.id)}
                      >
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {renderCategoryDropdown()}
      {renderTestDropdown()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerToggle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '60%',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectionCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  questionsListCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  questionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  optionItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  correctOptionItem: {
    backgroundColor: '#E8F5E9',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flex: 1,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closePreviewButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closePreviewText: {
    color: '#666',
    fontSize: 14,
  },
  previewContent: {
    flex: 1,
  },
  previewQuestion: {
    marginBottom: 24,
  },
  previewQuestionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 8,
  },
  previewQuestionText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  previewOption: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  previewCorrectOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  previewCorrectOptionText: {
    fontWeight: '600',
    color: '#1B5E20',
  },
  questionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  textUploadButton: {
    backgroundColor: '#FF9800',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  textUploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    maxHeight: 300,
    padding: 10,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  statsContainer: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  statsText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  previewButton: {
    backgroundColor: '#673ab7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addQuestionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  questionInput: {
    borderWidth: 1.5,
    borderColor: '#2196F3',
    borderRadius: 10,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  correctOptionInput: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  correctButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1.5,
    borderColor: '#ddd',
  },
  correctButtonSelected: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  correctButtonText: {
    color: '#333',
  },
  correctButtonTextSelected: {
    color: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  formButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  updateButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectorWrapper: {
    marginBottom: 16,
  },
  selector: {
    borderWidth: 1.5,
    borderColor: '#2196F3',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectorDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  selectorText: {
    fontSize: 16,
    color: '#2196F3',
  },
  selectorTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QuestionManagement;