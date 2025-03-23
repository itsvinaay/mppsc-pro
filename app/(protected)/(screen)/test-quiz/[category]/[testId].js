import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, AppState, StatusBar, SafeAreaView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../../config/firebase';
import ThreeDotsLoader from '../../../../../components/ThreeDotsLoader';

import { BlurView } from 'expo-blur';

// ----- UI Components -----

const QuizHeader = ({ quiz, currentQuestion, questions, timeLeft, totalTime, onNavigatorOpen, onBack }) => {
  const progressPercentage = ((currentQuestion + 1) / questions.length) * 100;
  
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#6366F1" />
        </TouchableOpacity>
        
        <Text style={styles.quizTitle} numberOfLines={1}>
          {quiz?.title || 'Quiz'}
        </Text>
        
        <TouchableOpacity 
          onPress={onNavigatorOpen}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.headerBottom}>
        <View style={styles.questionCounter}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.questionNumber}>
              {currentQuestion + 1}/{questions.length}
            </Text>
          </View>
        </View>
        
        <Timer timeLeft={timeLeft} totalTime={totalTime} />
      </View>
    </View>
  );
};

const Timer = ({ timeLeft, totalTime }) => {
  // Calculate percentage of time remaining
  const percentage = (timeLeft / totalTime) * 100;
  
  // Determine color based on time remaining
  const timerColor = useMemo(() => {
    if (percentage > 60) return '#10B981';
    if (percentage > 30) return '#F59E0B';
    return '#EF4444';
  }, [percentage]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.timerContainer}>
      <Ionicons name="time-outline" size={20} color={timerColor} />
      <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
    </View>
  );
};

const QuestionContent = ({ question, selectedAnswer, onSelectAnswer }) => {
  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionBubble}>
        <Text style={styles.questionText}>{question.question}</Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <OptionButton
            key={index}
            option={option}
            index={index}
            isSelected={selectedAnswer === index}
            onSelect={onSelectAnswer}
          />
        ))}
      </View>
    </View>
  );
};

const OptionButton = ({ option, index, isSelected, onSelect }) => (
  <TouchableOpacity
    style={[
      styles.optionButton,
      isSelected && styles.selectedOption
    ]}
    onPress={() => onSelect(index)}
    activeOpacity={0.7}
  >
    <View style={styles.optionContent}>
      <View style={[styles.optionIndicator, isSelected && styles.selectedIndicator]}>
        <Text style={[styles.optionIndicatorText, isSelected && styles.selectedOptionIndicatorText]}>
          {String.fromCharCode(65 + index)}
        </Text>
      </View>
      <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
        {option}
      </Text>
    </View>
  </TouchableOpacity>
);

const QuizFooter = ({ isFirstQuestion, isLastQuestion, onPrevious, onNext, onShowSubmit }) => {
  return (
    <View style={styles.footer}>
      <TouchableOpacity
        style={[styles.navButton, styles.prevButton, isFirstQuestion && styles.disabledButton]}
        onPress={onPrevious}
        disabled={isFirstQuestion}
      >
        <Ionicons name="chevron-back" size={20} color={isFirstQuestion ? "#94A3B8" : "#FFF"} />
        <Text style={[styles.navButtonText, isFirstQuestion && styles.disabledButtonText]}>Previous</Text>
      </TouchableOpacity>
      
      {isLastQuestion ? (
        <TouchableOpacity 
          style={[styles.navButton, styles.submitButton]}
          onPress={onShowSubmit}
        >
          <Text style={styles.navButtonText}>Submit Quiz</Text>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={onNext}
        >
          <Text style={styles.navButtonText}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const DialogBox = ({ title, message, primaryAction, primaryText, secondaryAction, secondaryText }) => (
  <View style={styles.dialogOverlay}>
    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
    <View style={styles.dialogBox}>
      <View style={styles.dialogHeader}>
        <Text style={styles.dialogTitle}>{title}</Text>
        <TouchableOpacity onPress={secondaryAction}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>
      <Text style={styles.dialogText}>{message}</Text>
      <View style={styles.dialogButtons}>
        <TouchableOpacity 
          style={[styles.dialogButton, styles.secondaryButton]}
          onPress={secondaryAction}
        >
          <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.dialogButton, styles.primaryButton]}
          onPress={primaryAction}
        >
          <Text style={styles.primaryButtonText}>{primaryText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const QuestionNavigator = ({ totalQuestions, currentQuestion, selectedAnswers, onSelectQuestion, onClose }) => {
  const getQuestionStatus = (index) => {
    if (selectedAnswers[index] !== undefined) return 'answered';
    if (index === currentQuestion) return 'current';
    return 'notVisited';
  };

  // Calculate progress stats
  const answeredCount = Object.keys(selectedAnswers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <View style={styles.questionNavigator}>
      <View style={styles.navigatorHeader}>
        <Text style={styles.navigatorHeaderText}>Question Navigator</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressStats}>
        <View style={styles.progressStatsCircle}>
          <Text style={styles.progressPercentage}>{progress}%</Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>
        <Text style={styles.progressDetail}>
          {answeredCount} of {totalQuestions} questions answered
        </Text>
      </View>
      
      <View style={styles.legendContainer}>
        {[
          { color: '#10B981', label: 'Answered' },
          { color: '#6366F1', label: 'Current' },
          { color: '#94A3B8', label: 'Not Visited' }
        ].map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.questionsGridContainer}>
        <View style={styles.questionsGrid}>
          {Array.from({ length: totalQuestions }).map((_, index) => {
            const status = getQuestionStatus(index);
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.gridItem}
                onPress={() => {
                  onSelectQuestion(index);
                  onClose();
                }}
              >
                <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS[status] }]}>
                  <Text style={styles.statusIndicatorText}>{index + 1}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const LoadingView = () => (
  <View style={styles.centerContainer}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.loaderContainer}>
 
    <ThreeDotsLoader size={20} color="#2196F3" />

      <Text style={styles.loadingText}>Loading Quiz...</Text>
    </View>
  </View>
);

const ErrorView = ({ message, onReturnToTests }) => (
  <View style={styles.centerContainer}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity 
        style={styles.backToHomeButton}
        onPress={onReturnToTests}
      >
        <Text style={styles.backToHomeButtonText}>Back to Tests</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const TimeWarningBanner = ({ timeLeft }) => (
  <Animated.View style={styles.timeWarningBanner}>
    <Ionicons name="alert-circle" size={22} color="#FFF" />
    <Text style={styles.timeWarningText}>
      Less than {Math.ceil(timeLeft / 60)} {Math.ceil(timeLeft / 60) === 1 ? 'minute' : 'minutes'} remaining!
    </Text>
  </Animated.View>
);

// ----- Constants -----

const STATUS_COLORS = {
  answered: '#10B981',
  current: '#6366F1',
  notVisited: '#94A3B8'
};

// ----- Main Component -----

const Quiz = () => {
  const router = useRouter();
  const { category, testId } = useLocalSearchParams();
  
  // State management
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300);
  const [totalTime, setTotalTime] = useState(300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isTimeAlmostUp, setIsTimeAlmostUp] = useState(false);
  
  // References
  const timerRef = useRef(null);
  const backgroundTimeStampRef = useRef(null);
  const appStateSubscriptionRef = useRef(null);
  
  // Memoized values
  const totalAnswered = useMemo(() => 
    Object.keys(selectedAnswers).length,
    [selectedAnswers]
  );
  
  const totalUnanswered = useMemo(() => 
    questions.length - totalAnswered,
    [questions.length, totalAnswered]
  );

  // ----- Data Fetching -----

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        
        // Fetch quiz metadata
        const docRef = doc(db, `categories/${category}/tests`, testId);
        const docSnap = await getDoc(docRef);
        console.log(docSnap);
        if (!docSnap.exists()) {
          throw new Error('Quiz not found');
        }

        const quizData = docSnap.data();
        setQuiz(quizData);
        
        // Set quiz duration
        const duration = quizData.duration ? quizData.duration * 60 : 300;
        setTimeLeft(duration);
        setTotalTime(duration);
        
        // Fetch questions
        const questionsSnapshot = await getDocs(collection(docRef, 'questions'));
        
        const fetchedQuestions = [];
        questionsSnapshot.forEach((doc) => {
          fetchedQuestions.push({ id: doc.id, ...doc.data() });
        });

        if (fetchedQuestions.length === 0) {
          throw new Error('No questions found for this quiz');
        }

        setQuestions(fetchedQuestions);
        console.log(fetchedQuestions);
      } catch (error) {
        console.error('Error loading quiz data:', error);
        setError(error.message || 'Failed to load quiz questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
    
    // Cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (appStateSubscriptionRef.current) appStateSubscriptionRef.current.remove();
    };
  }, [category, testId]);

  // ----- Timer Logic -----

  useEffect(() => {
    if (loading || questions.length === 0 || timeLeft <= 0) return;
    
    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Check if time is almost up (less than 10% remaining)
          if (newTime <= totalTime * 0.1 && !isTimeAlmostUp) {
            setIsTimeAlmostUp(true);
          }
          
          if (newTime <= 0) {
            clearInterval(timerRef.current);
            handleTimeUp();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    };
    
    startTimer();
    
    // Handle app state changes for background/foreground transitions
    appStateSubscriptionRef.current = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (appStateSubscriptionRef.current) appStateSubscriptionRef.current.remove();
    };
  }, [questions, timeLeft, totalTime, loading, isTimeAlmostUp]);

  // ----- Event Handlers -----

  const handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Going to background
      if (timerRef.current) clearInterval(timerRef.current);
      backgroundTimeStampRef.current = Date.now();
      
      await AsyncStorage.setItem('quizBackgroundData', JSON.stringify({
        timestamp: backgroundTimeStampRef.current,
        remainingTime: timeLeft
      }));
    } else if (nextAppState === 'active') {
      // Coming back to foreground
      try {
        const storedData = await AsyncStorage.getItem('quizBackgroundData');
        if (storedData) {
          const { timestamp, remainingTime } = JSON.parse(storedData);
          const timeInBackground = Math.floor((Date.now() - timestamp) / 1000);
          const newTime = Math.max(0, remainingTime - timeInBackground);
          
          setTimeLeft(newTime);
          
          if (newTime <= 0) {
            handleTimeUp();
          } else if (newTime <= totalTime * 0.1) {
            setIsTimeAlmostUp(true);
          }
        }
      } catch (error) {
        console.error('Error handling background state:', error);
      }
    }
  };

  const handleAnswerSelect = useCallback((optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion]: optionIndex
    }));
  }, [currentQuestion]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowSubmitDialog(true);
    }
  }, [currentQuestion, questions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const handleSubmit = useCallback(async () => { 
    try {
      // Clear any active timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
  
      // Calculate time taken - ensure it's not negative
      const timeTakenSeconds = Math.max(0, totalTime - timeLeft);
      const timeTakenMinutes = (timeTakenSeconds / 60).toFixed(2);
  
      // Format time for display (MM:SS format)
      const minutes = Math.floor(timeTakenSeconds / 60);
      const seconds = Math.floor(timeTakenSeconds % 60);
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
      console.log('Time calculation:', { 
        totalTime, 
        timeLeft, 
        timeTakenSeconds, 
        timeTakenMinutes, 
        formattedTime 
      });
  
      // Initialize result counters
      const totalQuestions = questions.length;
      let correct = 0, incorrect = 0, unattempted = totalQuestions;
  
      // Ensure selectedAnswers is defined
      const answers = selectedAnswers || {};
  
      questions.forEach((question, index) => {
        if (answers[index] !== undefined) {
          if (answers[index] === question.correctAnswer) {
            correct++;
          } else {
            incorrect++;
          }
          unattempted--;
        }
      });
  
      const score = correct;
  
      // Prepare results for storage
      const resultsForStorage = {
        category,
        testId,
        score,
        timeTaken: formattedTime,
        timeTakenMinutes,  
        correct,
        incorrect,
        unattempted,
        total: totalQuestions,
        answers,
        date: new Date().toISOString(),
      };
  
      console.log('Results for storage:', resultsForStorage);
  
      // Store results in AsyncStorage
      try {
        const historyKey = `quiz_history_${category}_${testId}`;
        await AsyncStorage.setItem(historyKey, JSON.stringify(resultsForStorage));
      } catch (error) {
        console.error('Error saving results:', error);
        Alert.alert('Error', 'Failed to save quiz results. Please try again.');
      }
  
      // Navigate to results screen
      router.replace({
        pathname: `/(screen)/test-result/${category}/${testId}`,
        params: {
          score: score.toString(),
          timeTaken: formattedTime,
          timeTakenMinutes,
          correct: correct.toString(),
          incorrect: incorrect.toString(),
          unattempted: unattempted.toString(),
          total: totalQuestions.toString(),
          answers: JSON.stringify(answers),
          questions: JSON.stringify(questions),
          title: quiz?.title || 'Quiz',
        }
      });
  
      console.log('Params for results screen:', {
        score: score.toString(),
        timeTaken: formattedTime,
        timeTakenMinutes,
        correct: correct.toString(),
        incorrect: incorrect.toString(),
        unattempted: unattempted.toString(),
      });
  
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', 'There was an issue submitting your quiz. Please try again.');
    }
  }, [questions, selectedAnswers, totalTime, timeLeft, category, testId, router, quiz]);
  
 
  const handleQuit = useCallback(() => {
    setShowQuitDialog(false);
    router.push(`/(screen)/test-list/${category}`);
  }, [category, router]);

  // ----- Rendering Logic -----

  // Render loading state
  if (loading) {
    return <LoadingView />;
  }

  // Render error state
  if (error) {
    return (
      <ErrorView 
        message={error} 
        onReturnToTests={() => router.push(`/(screen)/test-list/${category}`)} 
      />
    );
  }

  // No questions
  if (questions.length === 0) {
    return (
      <ErrorView 
        message="No questions available" 
        onReturnToTests={() => router.push(`/(screen)/test-list/${category}`)} 
      />
    );
  }

  // Current question
  const currentQuizQuestion = questions[currentQuestion];
  const isFirstQuestion = currentQuestion === 0;
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.container}>
          {/* Header */}
          <QuizHeader 
            quiz={quiz}
            currentQuestion={currentQuestion}
            questions={questions}
            timeLeft={timeLeft}
            totalTime={totalTime}
            onNavigatorOpen={() => setShowNavigator(true)}
            onBack={() => setShowQuitDialog(true)}
          />
          
          {/* Question Content */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <QuestionContent 
              question={currentQuizQuestion}
              selectedAnswer={selectedAnswers[currentQuestion]}
              onSelectAnswer={handleAnswerSelect}
            />
          </ScrollView>
          
          {/* Footer */}
          <QuizFooter 
            isFirstQuestion={isFirstQuestion}
            isLastQuestion={isLastQuestion}
            onPrevious={goToPreviousQuestion}
            onNext={goToNextQuestion}
            onShowSubmit={() => setShowSubmitDialog(true)}
          />
          
          {/* Overlays and Modals */}
          {showNavigator && (
            <View style={styles.navigatorOverlay}>
              <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
              <QuestionNavigator
                totalQuestions={questions.length}
                currentQuestion={currentQuestion}
                selectedAnswers={selectedAnswers}
                onSelectQuestion={setCurrentQuestion}
                onClose={() => setShowNavigator(false)}
              />
            </View>
          )}
          
          {showQuitDialog && (
            <DialogBox
              title="Quit Quiz"
              message="Are you sure you want to quit? Your progress will be lost and you'll need to start over."
              primaryAction={handleQuit}
              primaryText="Quit Quiz"
              secondaryAction={() => setShowQuitDialog(false)}
              secondaryText="Continue Quiz"
            />
          )}
          
          {showSubmitDialog && (
            <DialogBox
              title="Submit Quiz"
              message={`You've answered ${totalAnswered} out of ${questions.length} questions. Are you ready to submit your answers?`}
              primaryAction={handleSubmit}
              primaryText="Submit Quiz"
              secondaryAction={() => setShowSubmitDialog(false)}
              secondaryText="Review Answers"
            />
          )}
          
          {/* Time Warning Banner */}
          {isTimeAlmostUp && timeLeft <= totalTime * 0.1 && timeLeft > 0 && (
            <TimeWarningBanner timeLeft={timeLeft} />
          )}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // Layout Containers
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  
  // Header Component
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  
  // Progress Indicator
  questionCounter: {
    flex: 1,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
    marginRight: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    flex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  
  // Timer Component
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Question Display
  questionContainer: {
    marginBottom: 24,
  },
  questionBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  questionText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#1E293B',
    fontWeight: '600',
  },
  
  // Answer Options
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  selectedOption: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIndicator: {
    width: 48,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginRight: 16,
  },
  selectedIndicator: {
    backgroundColor: '#6366F1',
  },
  optionIndicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
  },
  selectedOptionIndicatorText: {
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
    paddingVertical: 18,
    paddingRight: 18,
  },
  selectedOptionText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  
  // Navigation Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  prevButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
  nextButton: {
    backgroundColor: '#6366F1',
  },
  submitButton: {
    backgroundColor: '#10B981',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    marginRight: 4,
  },
  
  // Dialog Boxes
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  dialogText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dialogButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Question Navigator
  navigatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  questionNavigator: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  navigatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navigatorHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  progressStatsCircle: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  progressDetail: {
    flex: 1,
    fontSize: 16,
    color: '#475569',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#64748B',
  },
  questionsGridContainer: {
    maxHeight: 300,
  },
  questionsGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    marginBottom: 8,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Loading View
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#475569',
    fontWeight: '600',
  },
  
  // Error View
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  backToHomeButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backToHomeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Time Warning Banner
  timeWarningBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timeWarningText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default Quiz;