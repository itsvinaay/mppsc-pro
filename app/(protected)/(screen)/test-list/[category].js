import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../../config/firebase';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { StatusBar } from 'expo-status-bar';
import ThreeDotsLoader from '../../../../components/ThreeDotsLoader';
export default function TestCategory() {
  const { incorrectQuestions, testId } = useLocalSearchParams();
  const [viewAnswerTests, setViewAnswerTests] = useState([]);
  const router = useRouter();
  const { category, id, name } = useLocalSearchParams();
  // const { category } = useLocalSearchParams();
  const [testAttempts, setTestAttempts] = useState({});
  const [fetchedData, setFetchedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
const attemptsColor = '#4f46e5';
  // Add this new function to fetch questions for a specific test
  const fetchQuestionsForTest = async (testId) => {
    try {
      const questionsRef = collection(db, `categories/${category}/tests/${testId}/questions`);
      const questionsSnapshot = await getDocs(questionsRef);
      
      const questions = [];
      questionsSnapshot.forEach((doc) => {
        questions.push({ id: doc.id, ...doc.data() });
      });
      
      return questions;
    } catch (error) {
      console.error(`Error fetching questions for test ${testId}:`, error);
      return [];
    }
  };

  // Modify the existing fetchData function
  useEffect(() => {
    const fetchData = async () => {
      console.log('Fetching data from Firestore...');
      try {
        if (!category) {
          setError('Category parameter is missing');
          setLoading(false);
          return;
        }

        const collectionPath = `categories/${category}/tests`;
        console.log('Fetching from collection:', collectionPath);

        if (!db) {
          throw new Error('Firebase database connection not established');
        }

        const collectionRef = collection(db, collectionPath);
        if (!collectionRef) {
          throw new Error('Invalid collection reference');
        }

        const querySnapshot = await getDocs(collectionRef);
        
        if (querySnapshot.empty) {
          console.log('No documents found in collection');
          setFetchedData([]);
          setLoading(false);
          return;
        }

        const data = [];
        const questionsData = {};

        // Fetch tests and their questions
        for (const doc of querySnapshot.docs) {
          if (doc.exists()) {
            const testData = { id: doc.id, ...doc.data() };
            data.push(testData);
            
            // Fetch questions for this test
            const questions = await fetchQuestionsForTest(doc.id);
            questionsData[doc.id] = questions;
          }
        }

        console.log('Successfully fetched data:', data);
        setFetchedData(data);
        setQuestionsMap(questionsData);

      } catch (error) {
        console.error('Error fetching Firestore data:', error);
        setError(error.message || 'Failed to fetch data');
        if (error.code) {
          console.error('Error code:', error.code);
        }
        if (error.message) {
          console.error('Error message:', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);
console.log('Fetched data:', fetchedData);


  useFocusEffect(
    useCallback(() => {
      const loadAllAttempts = async () => {
        try {
          const attemptsMap = {};
          for (const test of fetchedData) {
            const key = `attempts_${category}_${test.id}`;
            const storedAttempts = await AsyncStorage.getItem(key);
            console.log('Loading test list attempts:', { key, storedAttempts });
            attemptsMap[test.id] = storedAttempts ? parseInt(storedAttempts, 10) : 0;
          }
          setTestAttempts(attemptsMap);
        } catch (error) {
          console.error('Error loading test list attempts:', error);
          setError('Failed to load test attempts');
        }
      };

      if (fetchedData.length > 0) {
        loadAllAttempts();
      }
    }, [category, fetchedData])
  );
  console.log("Test Name:", name);
console.log('category:', category.name);
  useEffect(() => {
    if (incorrectQuestions) {
      try {
        const parsedIncorrectQuestions = JSON.parse(incorrectQuestions);
        if (parsedIncorrectQuestions.length > 0) {
          setViewAnswerTests(prev => [...prev, testId]);
        }
      } catch (error) {
        console.error('Error parsing incorrect questions:', error);
        setError('Failed to parse incorrect questions');
      }
    }
  }, [incorrectQuestions, testId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
        
        <ThreeDotsLoader size={20} color="#2196F3" />

          <Text style={styles.loadingText}>Loading tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            style={styles.errorButton}
          >
            <Ionicons name="home" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.errorButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="information-circle" size={60} color="#f59e0b" />
          <Text style={styles.errorTitle}>Category Missing</Text>
          <Text style={styles.errorText}>No category was specified</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            style={styles.errorButton}
          >
            <Ionicons name="home" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.errorButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!fetchedData.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/(screen)/test-series')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{name}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#6b7280" />
          <Text style={styles.emptyTitle}>No Tests Available</Text>
          <Text style={styles.emptyText}>No tests were found for {category}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            style={styles.emptyButton}
          >
            <Ionicons name="home" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.emptyButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

<StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      
     
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(screen)/test-series')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{name}</Text>

        <TouchableOpacity 
          onPress={() => router.push('/(tabs)')}
          style={[styles.backButton, {marginLeft: 'auto'}]}
        >
          <Ionicons name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>Available Tests ({fetchedData.length})</Text>
      </View>

      <ScrollView style={styles.content}>
        {fetchedData.map((test) => {
          const attempts = testAttempts[test.id] || 0;
          const attemptsRemaining = 3 - attempts;
          const questions = questionsMap[test.id] || [];
          const questionCount = questions.length;
          
          return (
            <TouchableOpacity
              key={test.id}
              onPress={() => {
                router.push({
                  pathname: `/(screen)/test-detail/${category}/${test.id}`,
                  params: { 
                    questions: JSON.stringify(questions),
                    totalQuestions: questionCount
                  }
                });
              }}
              style={styles.testCard}
              activeOpacity={0.7}
            >
              <View style={styles.testHeader}>
                <View style={styles.testIconContainer}>
                  <Ionicons name="document-text" size={22} color="#4f46e5" />
                </View>
                <View style={styles.testInfo}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.testName}>{test.title}</Text>
                    <Text style={styles.testQuestion}>Questions: {questionCount}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.marksText}>{test.marks} Marks</Text>
                    <Text style={styles.testQuestion}>Duration: {test.duration}min</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.testDetails}>
                <View style={styles.attemptsContainer}>
                  <View style={styles.attemptsRow}>
                    <Text style={styles.attemptsLabel}>Attempts</Text>
                    <View style={[styles.attemptsIndicator, {backgroundColor: attemptsColor}]}>
                      <Text style={styles.attemptsValue}>{attempts}/3</Text>
                    </View>
                  </View>
                  
                  <View style={styles.attemptsDots}>
                    {[0, 1, 2].map((dot) => (
                      <View 
                        key={dot} 
                        style={[
                          styles.attemptDot, 
                          {backgroundColor: dot < attempts ? attemptsColor : '#e5e7eb'}
                        ]} 
                      />
                    ))}
                  </View>
                </View>

                {attempts >= 2 && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      console.log('Navigating to test answers:', `/(screen)/test-answers/${category}/${test.id}`);
                      router.push(`/(screen)/test-answers/${category}/${test.id}`);
                    }}
                    style={styles.viewAnswersButton}
                  >
                    <Text style={styles.viewAnswersText}>VIEW ANSWERS</Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.testFooter}>
                <TouchableOpacity 
                  style={[
                    styles.startButton, 
                    attemptsRemaining === 0 ? styles.disabledButton : {}
                  ]}
                  disabled={attemptsRemaining === 0}
                  onPress={() => {
                    router.push(`/(screen)/test-detail/${category}/${test.id}`);
                  }}
                >
                  <Text style={styles.startButtonText}>
                    {attemptsRemaining === 0 ? "No Attempts Left" : "Start Test"}
                  </Text>
                  {attemptsRemaining > 0 && (
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
   header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12
  },
  headerTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
    marginLeft: 16,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  marksText: {
    fontSize: 14,
    color: '#6b7280',
  },
  testQuestion: {
    fontSize: 14,
    color: '#6b7280',
  },
  testDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attemptsContainer: {
    flex: 1,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  attemptsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  attemptsIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  attemptsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  attemptsDots: {
    flexDirection: 'row',
  },
  attemptDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  viewAnswersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAnswersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginRight: 4,
  },
  testFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  startButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  questionCount: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
  },
  questionCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  questionIcon: {
    marginRight: 4,
  },
});