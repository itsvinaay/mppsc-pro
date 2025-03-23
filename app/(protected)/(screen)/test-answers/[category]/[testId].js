import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, doc } from 'firebase/firestore';
import { db } from '../../../../../config/firebase';

const TestAnswers = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, unattempted: 0 });

  const answers = useMemo(() => {
    try {
      return params.answers ? JSON.parse(params.answers) : {};
    } catch (error) {
      console.error('Error parsing answers:', error);
      return {};
    }
  }, [params.answers]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const docRef = doc(db, `categories/${params.category}/tests`, params.testId);
        const questionsSnapshot = await getDocs(collection(docRef, 'questions'));
        const fetchedQuestions = [];
        questionsSnapshot.forEach((doc) => {
          fetchedQuestions.push({ id: doc.id, ...doc.data() });
        });
        
        setQuestions(fetchedQuestions);
        
        // Calculate stats
        let correct = 0;
        let incorrect = 0;
        let unattempted = 0;
        
        fetchedQuestions.forEach((question, index) => {
          const userAnswer = answers[index];
          if (userAnswer === undefined) {
            unattempted++;
          } else if (Number(userAnswer) === Number(question.correctAnswer)) {
            correct++;
          } else {
            incorrect++;
          }
        });
        
        setStats({ correct, incorrect, unattempted });
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [params.category, params.testId, answers]);

  const handleBack = () => {
    router.replace(`/(screen)/test-list/${params.category}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading answers...</Text>
      </View>
    );
  }

  const renderQuestion = (question, index) => {
    const userAnswer = answers[index];
    const isCorrect = Number(userAnswer) === Number(question.correctAnswer);
    const isUnattempted = userAnswer === undefined;

    return (
      <View key={question.id} style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>Question {index + 1}</Text>
          {!isUnattempted ? (
            <View style={[styles.statusBadge, { backgroundColor: isCorrect ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[styles.statusText, { color: isCorrect ? '#00C853' : '#FF0000' }]}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#F5F5F5' }]}>
              <Text style={[styles.statusText, { color: '#757575' }]}>
                Unattempted
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option, optionIndex) => {
            const isSelected = Number(userAnswer) === optionIndex;
            const isCorrectOption = Number(question.correctAnswer) === optionIndex;
            
            let optionStyle = styles.optionItem;
            let iconToShow = null;
            
            // In the header section
                        <View style={styles.headerContent}>
                          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                          </TouchableOpacity>
                          <Text style={styles.headerTitle}>Test Results</Text>
                        </View>
            
            // In the options section
                                if (isCorrectOption) {
                                  optionStyle = {...optionStyle, ...styles.correctOption};
                                  iconToShow = <Ionicons name="checkmark-circle" size={18} color="#00C853" />;
                                } else if (isSelected && !isCorrect) {
                                  optionStyle = {...optionStyle, ...styles.incorrectSelected};
                                  iconToShow = <Ionicons name="close-circle" size={18} color="#FF0000" />;
                                }

            return (
              <View key={optionIndex} style={optionStyle}>
                <Text style={[styles.optionLetter, 
                  isCorrectOption && styles.correctOptionLetter,
                  isSelected && !isCorrect && styles.incorrectOptionLetter
                ]}>
                  {String.fromCharCode(65 + optionIndex)}
                </Text>
                <Text style={[
                  styles.optionText,
                  (isSelected || isCorrectOption) && styles.highlightedOptionText
                ]}>
                  {option}
                </Text>
                {iconToShow && (
                  <View style={styles.optionIcon}>
                    {iconToShow}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {!isCorrect && !isUnattempted && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>Explanation</Text>
            <Text style={styles.explanationText}>
              {question.explanation || `The correct answer is option ${String.fromCharCode(65 + Number(question.correctAnswer))}: ${question.options[question.correctAnswer]}`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const calculatePercentage = (value) => {
    return questions.length > 0 ? Math.round((value / questions.length) * 100) : 0;
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
     
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Test Results</Text>
        </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statItem, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.statValue}>{stats.correct}</Text>
          <Text style={styles.statLabel}>Correct</Text>
          <Text style={styles.statPercentage}>{calculatePercentage(stats.correct)}%</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#FFEBEE' }]}>
          <Text style={styles.statValue}>{stats.incorrect}</Text>
          <Text style={styles.statLabel}>Incorrect</Text>
          <Text style={styles.statPercentage}>{calculatePercentage(stats.incorrect)}%</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#F5F5F5' }]}>
          <Text style={styles.statValue}>{stats.unattempted}</Text>
          <Text style={styles.statLabel}>Unattempted</Text>
          <Text style={styles.statPercentage}>{calculatePercentage(stats.unattempted)}%</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Answer Review</Text>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {questions.map(renderQuestion)}
        
        <TouchableOpacity style={styles.returnButton} onPress={handleBack}>
          <Text style={styles.returnButtonText}>Return to Test List</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: Platform.OS === 'android' ? 80 + StatusBar.currentHeight : 80,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    position: 'relative',
  },
  optionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 12,
  },
  correctOptionLetter: {
    backgroundColor: '#E8F5E9',
    color: '#00C853',
  },
  incorrectOptionLetter: {
    backgroundColor: '#FFEBEE',
    color: '#FF0000',
  },
  correctSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#00C853',
  },
  incorrectSelected: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF0000',
  },
  correctOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#00C853',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  highlightedOptionText: {
    fontWeight: '500',
  },
  optionIcon: {
    position: 'absolute',
    right: 12,
  },
  explanationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  returnButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TestAnswers;