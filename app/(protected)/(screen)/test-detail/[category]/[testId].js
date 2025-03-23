import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../../../config/firebase';
// import { LinearGradient } from 'expo-linear-gradient';
import ThreeDotsLoader from '../../../../../components/ThreeDotsLoader';

import { addDoc, serverTimestamp, increment } from 'firebase/firestore';

// Component for individual stat boxes with improved design
const StatBox = ({ icon, label, value, iconColor }) => (
  <View style={styles.statBox}>
    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Redesigned Score Entry component
const ScoreEntry = ({ score, total, date, isLatest }) => {
  const percentage = ((score / total) * 100).toFixed(0);
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short', 
    day: 'numeric'
  });
  
  // Color gradient based on score
  let scoreColor;
  if (percentage >= 80) scoreColor = '#22c55e';
  else if (percentage >= 70) scoreColor = '#4ade80';
  else if (percentage >= 60) scoreColor = '#facc15';
  else if (percentage >= 50) scoreColor = '#fb923c';
  else scoreColor = '#ef4444';
  
  return (
    <View style={[styles.scoreEntry, isLatest && styles.latestScoreEntry]}>
      <View style={styles.scoreEntryLeft}>
        {isLatest && (
          <View style={styles.latestBadge}>
            <Text style={styles.latestBadgeText}>Latest</Text>
          </View>
        )}
        <Text style={styles.scoreDate}>{formattedDate}</Text>
      </View>
      
      <View style={styles.scoreEntryMiddle}>
        <View style={styles.scoreBar}>
          <View 
            style={[
              styles.scoreBarFill, 
              { width: `${percentage}%`, backgroundColor: scoreColor }
            ]} 
          />
        </View>
      </View>
      
      <View style={styles.scoreEntryRight}>
        <Text style={styles.scoreRatio}>{score}/{total}</Text>
        <Text style={[styles.scorePercentage, { color: scoreColor }]}>{percentage}%</Text>
      </View>
    </View>
  );
};

export default function TestDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const category = params.category;
  const testId = params.testId;
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [testData, setTestData] = useState({
    test: null,
    attempts: 0,
    previousScores: [],
    bestScore: { score: 0, total: 0, percentage: '0' },
    timeLeft: 300,
    startTime: null
  });
  
  // Format time helper function
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch test details
  const fetchTestDetails = useCallback(async () => {
    let isActive = true; // Flag to track if the component is mounted
  
    setLoading(true);
    try {
      // First fetch test details
      const docRef = doc(db, `categories/${category}/tests`, testId);
      const docSnap = await getDoc(docRef);
  
      if (!docSnap.exists()) {
        console.log('No such document!');
        if (isActive) {
          setTestData(prev => ({
            ...prev,
            test: { title: '', totalQuestions: 0, duration: 5 },
          }));
        }
        return;
      }
  
      const testDetails = docSnap.data();
      console.log('Test details:', testDetails);
  
      if (isActive) {
        setTestData(prev => ({
          ...prev,
          test: testDetails,
          timeLeft: (testDetails.duration || 5) * 60,
          isPremium: testDetails.isPremium || false,
          price: testDetails.price || 0
        }));
      }
      
      // Check if user has purchased this test
      const user = auth.currentUser;
      if (user && testDetails.isPremium) {
        const purchasesRef = collection(db, 'purchases');
        const q = query(
          purchasesRef,
          where('userId', '==', user.uid),
          where('testId', '==', testId),
          where('status', '==', 'completed')
        );
        
        const purchaseSnapshot = await getDocs(q);
        if (!purchaseSnapshot.empty) {
          if (isActive) {
            setTestData(prev => ({
              ...prev,
              isPurchased: true
            }));
          }
        }
      }
  
      // Fetch questions
      const questionsRef = collection(docRef, 'questions');
      const questionsSnapshot = await getDocs(questionsRef);
      
      const fetchedQuestions = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      console.log('Fetched Questions:', fetchedQuestions);
  
      // Update questions even if empty
      if (isActive) {
        setQuestions(fetchedQuestions);
      }
  
      // Only throw error if both test details and questions are missing
      if (fetchedQuestions.length === 0 && !testDetails) {
        throw new Error('Test data not found');
      }
  
    } catch (error) {
      console.error('Error fetching test details:', error);
      Alert.alert(
        "Error",
        "Failed to load test details. Please try again.",
        [{ text: "OK" }]
      );
  
      if (isActive) {
        setTestData(prev => ({
          ...prev,
          test: { title: '', totalQuestions: 0, duration: 5 },
        }));
      }
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  
    return () => { isActive = false };
  }, [category, testId]);
  

  // Load attempts from AsyncStorage
  const loadAttempts = useCallback(async () => {
    try {
      const key = `attempts_${category}_${testId}`;
      const storedAttempts = await AsyncStorage.getItem(key);
      setTestData(prev => ({
        ...prev,
        attempts: storedAttempts ? parseInt(storedAttempts, 10) : 0
      }));
    } catch (error) {
      console.error('Error loading attempts:', error);
    }
  }, [category, testId]);

  // Fetch test history
  const fetchTestHistory = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const testHistoryRef = collection(db, 'testHistory');
      const q = query(
        testHistoryRef,
        where('userId', '==', user.uid),
        where('testId', '==', testId),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      if (history.length > 0) {
        // Format previous scores
        const formattedScores = history.map(record => ({
          score: record.score,
          total: record.total,
          date: record.timestamp.toISOString(),
          percentage: ((record.score / record.total) * 100).toFixed(2)
        }));
        
        // Calculate best score
        const bestScoreEntry = history.reduce((max, score) => {
          const currentPercentage = (score.score / score.total) * 100;
          const maxPercentage = (max.score / max.total) * 100;
          return (maxPercentage > currentPercentage) ? max : score;
        }, { score: 0, total: 1, percentage: 0 });
        
        setTestData(prev => ({
          ...prev,
          previousScores: formattedScores,
          bestScore: {
            score: bestScoreEntry.score,
            total: bestScoreEntry.total,
            percentage: ((bestScoreEntry.score / bestScoreEntry.total) * 100).toFixed(2)
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
    }
  }, [testId]);

  // Handle payment
 

  // Record purchase in Firestore
  const recordPurchase = async (paymentData) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Add purchase record
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        testId: testId,
        categoryId: category,
        testName: testData.test.title,
        amount: testData.price,
        paymentId: paymentData.razorpay_payment_id,
        status: 'completed',
        timestamp: serverTimestamp()
      });
      
      // Update test with purchase count (optional)
      const testRef = doc(db, `categories/${category}/tests`, testId);
      await updateDoc(testRef, {
        purchaseCount: increment(1)
      });
    } catch (error) {
      console.error('Error recording purchase:', error);
    }
  };

  // Handle starting a test
  const startTest = async () => {
    // Check if premium and not purchased
    if (testData.isPremium && !testData.isPurchased) {
      Alert.alert(
        "Premium Test",
        "This is a premium test. Please purchase to access.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Buy Now is ", onPress: handlePayment }
        ]
      );
      return;
    }
    
    if (testData.attempts >= 80) {
      Alert.alert("Maximum Attempts", "You have reached the maximum number of attempts for this test.");
      return;
    }

    try {
      // Check if quiz has questions
      const docRef = doc(db, `categories/${category}/tests`, testId);
      const questionsSnapshot = await getDocs(collection(docRef, 'questions'));
      
      if (questionsSnapshot.empty) {
        Alert.alert(
          "No Questions",
          "This test currently has no questions available. Please try again later.",
          [{ text: "OK" }]
        );
        return;
      }

      // Increment attempts counter
      const newAttempts = testData.attempts + 1;
      const key = `attempts_${category}_${testId}`;
      
      await AsyncStorage.setItem(key, newAttempts.toString());
      setTestData(prev => ({ ...prev, attempts: newAttempts }));
      
      // Navigate to the quiz screen
      router.push(`/(screen)/test-quiz/${category}/${testId}`);
    } catch (error) {
      console.error('Error starting test:', error);
      Alert.alert(
        "Error",
        "Failed to start test. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Load initial data
  useEffect(() => {
    if (category && testId) {
      fetchTestDetails();
    }
  }, [fetchTestDetails, category, testId]);

  // Update attempts when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (category && testId) {
        loadAttempts();
        fetchTestHistory();
      }
    }, [loadAttempts, fetchTestHistory, category, testId])
  );

  if (loading || !testData.test) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
        
        <ThreeDotsLoader size={20} color="#2196F3" />

        <Text style={styles.loadingText}>Loading test details...</Text>
      </SafeAreaView>
    );
  }

  // Calculate remaining attempts
  const remainingAttempts = 80 - testData.attempts;
  const attemptsPercentage = (testData.attempts / 80) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      
     
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#4f46e5' }]}>
          <TouchableOpacity 
            onPress={() => router.push('/(screen)/test-series')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{testData.test.title || 'Test Details'}</Text>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)')}
            style={[styles.backButton, {marginLeft: 'auto'}]}
          >
            <Ionicons name="home-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Test Info Card */}
          <View style={styles.infoCard}>
            {testData.isPremium && (
              <View style={styles.premiumBadgeContainer}>
                {/* <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumBadge}
                > */}
                  <Ionicons name="star" size={14} color="#fff" />
                  <Text style={styles.premiumBadgeText}>Premium</Text>
                {/* </LinearGradient> */}
                <Text style={styles.priceText}>₹{testData.price}</Text>
              </View>
            )}
            <Text style={styles.testDescription}>
              {testData.test.description || 'Complete this test to assess your knowledge.'}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatBox 
              icon="help-circle-outline" 
              label="Questions" 
              value={questions.length || 0} 
              iconColor="#4f46e5" 
            />
            
            <StatBox 
              icon="time-outline" 
              label="Duration" 
              value={formatTime(testData.timeLeft)} 
              iconColor="#f59e0b" 
            />
            
            <StatBox 
              icon="repeat" 
              label="Attempts" 
              value={`${testData.attempts}/80`} 
              iconColor="#ec4899" 
            />
          </View>
          
          {/* Attempts Progress Card */}
          <View style={styles.card}>
            <View style={styles.attemptsHeaderRow}>
              <Text style={styles.cardTitle}>Remaining Attempts</Text>
              <View style={styles.attemptsBadge}>
                <Text style={styles.attemptsBadgeText}>{remainingAttempts}</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${attemptsPercentage}%` }
                ]}
              />
            </View>
          </View>

          {/* Best Score Card */}
          {testData.bestScore.score > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Ionicons name="trophy" size={20} color="#f59e0b" />
                  <Text style={styles.cardTitle}>Best Performance</Text>
                </View>
                
                <Text style={styles.cardDate}>
                  {testData.previousScores.length > 0 && 
                    new Date(testData.previousScores.find(score => 
                      score.score === testData.bestScore.score && 
                      score.total === testData.bestScore.total
                    )?.date || new Date()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                </Text>
              </View>
              
              <View style={styles.bestScoreContent}>
                <View style={styles.bestScoreCircle}>
                  <Text style={styles.bestScorePercentage}>{testData.bestScore.percentage}%</Text>
                </View>
                
                <View style={styles.bestScoreDetails}>
                  <Text style={styles.bestScoreLabel}>Correct Answers</Text>
                  <Text style={styles.bestScoreValue}>
                    {testData.bestScore.score}/{testData.bestScore.total}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Previous Attempts Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="history" size={20} color="#4f46e5" />
                <Text style={styles.cardTitle}>Previous Attempts</Text>
              </View>
            </View>
            
            {testData.previousScores.length > 0 ? (
              <View style={styles.scoresList}>
                {testData.previousScores.map((scoreEntry, index) => (
                  <ScoreEntry 
                    key={index}
                    score={scoreEntry.score} 
                    total={scoreEntry.total} 
                    date={scoreEntry.date} 
                    isLatest={index === 0}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No attempts yet</Text>
                <Text style={styles.emptyStateSubtitle}>Start your first test to see results here</Text>
              </View>
            )}
          </View>
          
          {/* Spacer for button */}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Start Test or Buy Now Button */}
        <View style={styles.buttonContainer}>
          {testData.isPremium && !testData.isPurchased ? (
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: '#4f46e5' }]}
              onPress={handlePayment}
              disabled={paymentLoading}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                {paymentLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.startButtonText}>BUY NOW • ₹{testData.price}</Text>
                    <Ionicons name="cart-outline" size={20} color="#fff" />
                  </>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[
                styles.startButton, 
                { backgroundColor: '#4f46e5' },
                testData.attempts >= 80 && styles.disabledButton
              ]}
              onPress={startTest}
              disabled={testData.attempts >= 80}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.startButtonText}>
                  {testData.attempts >= 80 ? 'MAXIMUM ATTEMPTS REACHED' : 'START TEST'}
                </Text>
                {testData.attempts < 80 && (
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
// Update the button styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4f46e5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // Header
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
  
  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  testDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  cardDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  // Attempts Progress
  attemptsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attemptsBadge: {
    backgroundColor: '#4f46e520',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  attemptsBadgeText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  
  // Best Score
  bestScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestScoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4f46e5',
  },
  bestScorePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  bestScoreDetails: {
    flex: 1,
    marginLeft: 20,
  },
  bestScoreLabel: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
  },
  bestScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  // Score Entries  
  scoresList: {
    marginTop: 6,
  },
  scoreEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  latestScoreEntry: {
    backgroundColor: '#f5f7ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderBottomWidth: 0,
  },
  scoreEntryLeft: {
    flex: 1,
  },
  latestBadge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  latestBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scoreDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  scoreEntryMiddle: {
    flex: 2,
    paddingHorizontal: 12,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
  },
  scoreEntryRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  scoreRatio: {
    fontSize: 14,
    color: '#6b7280',
  },
  scorePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 14,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
  },
  
  // Button
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    elevation: 5,
  },
  startButton: {
    width: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});