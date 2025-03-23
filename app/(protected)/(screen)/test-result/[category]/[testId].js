import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ScrollView, 
  Share, 
  Platform, 
  StatusBar, 
  Alert, 
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
// import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useCallback, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ThreeDotsLoader from '../../../../../components/ThreeDotsLoader';

import { 
  addDoc, 
  collection, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../../../../../config/firebase';

const { height, width } = Dimensions.get('window');
const isSmallDevice = height < 700;
const headerHeight = isSmallDevice ? 120 : 150;
const scoreCircleSize = isSmallDevice ? 100 : 120;
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const Result = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  
  // States
  const [userRank, setUserRank] = useState('...');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [hasScoreSaved, setHasScoreSaved] = useState(false);

  // Parse and validate params
  const category = params.category || '';
  const testId = params.testId || '';
  const score = parseInt(params.score) || 0;
  // const timeTaken = parseFloat(params.timeTaken) || 0;
  const correct = parseInt(params.correct) || 0;
  const incorrect = parseInt(params.incorrect) || 0;
  const unattempted = parseInt(params.unattempted) || 0;
  const total = parseInt(params.total) || 0;
  const answers = params.answers ? JSON.parse(params.answers) : {};
  const attempts = parseInt(params.attempts) || 1;
  const testName = params.title || 'Unknown Test';

  const timeTaken = (() => {
    if (typeof params.timeTaken === 'string' && params.timeTaken.includes(':')) {
      const [minutes, seconds] = params.timeTaken.split(':').map(Number);
      return (minutes * 60) + seconds;
    }
    return parseFloat(params.timeTaken) || 0;
  })();
  // Calculate percentage using useMemo to avoid recalculation
  const percentage = useMemo(() => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [correct, total]);

  console.log('Parsed Params:', {
    category,
    testId,
    score,
    timeTaken,
    correct,
    incorrect,
    unattempted,
    total,
    answers,
    attempts,
    testName
  });
  useEffect(() => {
    // Disable drawer and handle hardware back button
    navigation.setOptions({
      swipeEnabled: false,
      gestureEnabled: false,
    });
  }, []);

  // Get user rank from Firestore
  const getUserRank = useCallback(async () => {
    try {
      const testHistoryRef = collection(db, 'testHistory');
      const testSnapshot = await getDocs(testHistoryRef);
      const userScores = {};

      testSnapshot.docs.forEach(doc => {
        const test = doc.data();
        if (!userScores[test.userId]) {
          userScores[test.userId] = {
            totalScore: 0,
            testsCount: 0
          };
        }
        userScores[test.userId].totalScore += test.percentage || 0;
        userScores[test.userId].testsCount += 1;
      });

      const rankings = Object.entries(userScores)
        .map(([userId, scores]) => ({
          userId,
          averageScore: scores.totalScore / scores.testsCount
        }))
        .sort((a, b) => b.averageScore - a.averageScore);

      const currentUserId = auth.currentUser?.uid;
      const userRank = rankings.findIndex(rank => rank.userId === currentUserId) + 1;
      const totalUsers = rankings.length;

      return `${userRank} / ${totalUsers}`;
    } catch (error) {
      console.error('Error calculating rank:', error);
      return 'N/A';
    }
  }, []);

  // Save test result to Firebase
  const saveResultToFirebase = useCallback(async () => {
    if (hasScoreSaved) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Save to testHistory collection
      const testHistoryRef = collection(db, 'testHistory');
      await addDoc(testHistoryRef, {
        userId: user.uid,
        testId,
        categoryId: category,
        testName,
        categoryName: category,
        score,
        percentage,
        timeTaken,
        correct,
        incorrect,
        unattempted,
        total,
        answers,
        timestamp: serverTimestamp(),
        attempts
      });

      // Update user's stats in users collection
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        testsTaken: increment(1),
        lastTestDate: serverTimestamp(),
        totalScore: increment(score),
        totalTime: increment(timeTaken),
        // Only update highest score if current percentage is higher
        ...(percentage > 0 && { highestScore: percentage })
      });

      // Calculate and update rank
      const rank = await getUserRank();
      setUserRank(rank);
      setHasScoreSaved(true);
      
      // Save to AsyncStorage
      await saveScoreToStorage();

    } catch (error) {
      console.error('Error saving test result:', error);
      setSaveError(error.message);
      Alert.alert(
        'Error',
        'Failed to save test results to server. Your progress might not be tracked.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    category, 
    testId, 
    score, 
    percentage, 
    timeTaken, 
    correct, 
    incorrect, 
    unattempted, 
    total, 
    answers, 
    attempts, 
    testName, 
    hasScoreSaved,
    getUserRank,
    saveScoreToStorage
  ]);

  // Save score to AsyncStorage
  const saveScoreToStorage = useCallback(async () => {
    try {
      const key = `previous_scores_${category}_${testId}`;
      const storedScores = await AsyncStorage.getItem(key);
      const parsedScores = storedScores ? JSON.parse(storedScores) : [];
      
      const newScore = {
        score,
        total,
        date: new Date().toISOString(),
        timeTaken,
        percentage,
        correct,
        incorrect,
        unattempted
      };
      
      const updatedScores = [...parsedScores, newScore];
      const limitedScores = updatedScores.slice(-5); // Keep only the last 5 scores
      
      await AsyncStorage.setItem(key, JSON.stringify(limitedScores));
      return true;
    } catch (error) {
      console.error('Error saving score to storage:', error);
      return false;
    }
  }, [category, testId, score, total, timeTaken, percentage, correct, incorrect, unattempted]);

  // Save result on component mount
  useEffect(() => {
    if (!hasScoreSaved && category && testId) {
      saveResultToFirebase();
    }
  }, [saveResultToFirebase, hasScoreSaved, category, testId]);

  // Share result
  const handleShare = useCallback(async () => {
    try {
      const formattedTime = timeTaken.toFixed(2);
      const message = 
        `📱 Quiz Result from StudoTest\n\n` +
        `📊 Score: ${score}\n` +
        `✅ Correct: ${correct}\n` +
        `❌ Incorrect: ${incorrect}\n` +
        `❓ Unattempted: ${unattempted}\n` +
        `⏱️ Time: ${formattedTime} mins\n` +
        `📋 Category: ${category}\n\n` +
        `🎯 Accuracy: ${percentage}%`;

      const result = await Share.share({
        message,
        title: 'Quiz Result',
      });
    } catch (error) {
      Alert.alert(
        'Sharing Failed',
        'Could not share your results. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [score, correct, incorrect, unattempted, timeTaken, category, percentage]);

  // Navigate to answers screen
  const handleViewAnswers = useCallback(() => {
    if (!category || !testId) {
      Alert.alert(
        'Error',
        'Cannot load answers. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    router.push({
      pathname: '/(screen)/test-answers/' + category + '/' + testId,
      params: {
        category,
        testId,
        score,
        timeTaken,
        correct,
        incorrect,
        unattempted,
        total,
        attempts,
        answers: params.answers
      }
    });
  }, [category, testId, score, timeTaken, correct, incorrect, unattempted, total, attempts, params.answers, router]);

  // Navigate to home
  const handleHome = useCallback(() => {
    router.replace('/(screen)/test-list/' + category);
  }, [category, router]);

  // Navigate back
  const handleBack = useCallback(() => {
    router.replace(`/(screen)/test-list/${category}`);
  }, [category, router]);

  // Render loading state
  if (isSaving) {
    return (
      <View style={[styles.container, styles.centerContent]}>
   <ThreeDotsLoader size={20} color="#2196F3" />
        <Text style={styles.loadingText}>Saving your results...</Text>
      </View>
    );
  }

  // Render error state
  if (saveError && !hasScoreSaved) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to save your results</Text>
        <TouchableOpacity 
          style={styles.errorButton} 
          onPress={() => saveResultToFirebase()}
        >
          <Text style={styles.errorButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.errorButton, { marginTop: 10, backgroundColor: '#888' }]} 
          onPress={handleHome}
        >
          <Text style={styles.errorButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render invalid test data state
  if (!category || !testId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Invalid test data</Text>
        <TouchableOpacity 
          style={styles.errorButton} 
          onPress={handleHome}
        >
          <Text style={styles.errorButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main component render
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2196F3" barStyle="light-content" />
      {/* <LinearGradient
        colors={['#2196F3', '#1a237e']}
        style={[styles.header, { height: headerHeight + statusBarHeight }]}
      > */}
         <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Test Result</Text>
        </View>
      {/* </LinearGradient> */}

      <View style={styles.scoreCircleContainer}>
        <View style={[styles.scoreCircle, { width: scoreCircleSize, height: scoreCircleSize }]}>
          <Text style={styles.scoreText}>{percentage}%</Text>
          <Text style={styles.scoreSubtext}>
            {percentage >= 70 ? 'Great!' : percentage >= 50 ? 'Good' : 'Keep trying'}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Taken</Text>
            <Text style={styles.infoValue}>{params.timeTaken} mins</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Questions</Text>
            <Text style={styles.infoValue}>{total}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Score</Text>
            <Text style={styles.infoValue}>{score}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Test Name</Text>
            <Text style={styles.infoValue}>{testName}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, styles.correctCard]}>
            <Ionicons name="checkmark-circle" size={isSmallDevice ? 20 : 24} color="#00C853" />
            <Text style={styles.statsLabel}>Correct</Text>
            <Text style={styles.statsValue}>{correct}</Text>
          </View>
          <View style={[styles.statsCard, styles.incorrectCard]}>
            <Ionicons name="close-circle" size={isSmallDevice ? 20 : 24} color="#FF5252" />
            <Text style={styles.statsLabel}>Incorrect</Text>
            <Text style={styles.statsValue}>{incorrect}</Text>
          </View>
          <View style={[styles.statsCard, styles.unattemptedCard]}>
            <Ionicons name="help-circle" size={isSmallDevice ? 20 : 24} color="#9E9E9E" />
            <Text style={styles.statsLabel}>Unattempted</Text>
            <Text style={styles.statsValue}>{unattempted}</Text>
          </View>
        </View>

        <View style={styles.rankContainer}>
          <Text style={styles.rankLabel}>Your Rank</Text>
          <Text style={styles.rankText}>{userRank}</Text>
        </View>

        <TouchableOpacity 
          style={styles.shareButton} 
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.shareText}>Share Result</Text>
          <Ionicons name="share-social" size={isSmallDevice ? 20 : 24} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerButton, styles.viewAnswersButton]} 
          onPress={handleViewAnswers}
          activeOpacity={0.7}
        >
          <Text style={styles.footerButtonText}>VIEW ANSWERS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.footerButton, styles.homeButton]} 
          onPress={handleHome}
          activeOpacity={0.7}
        >
          <Text style={styles.footerButtonText}>HOME</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    color: 'white',
    fontWeight: '700',
    marginLeft: 16,
  },
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorButton: {
    backgroundColor: '#4169E1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // height: 56,
  },

  scoreCircleContainer: {
    position: 'absolute',
    top: headerHeight + statusBarHeight - (scoreCircleSize / 2),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  scoreCircle: {
    backgroundColor: '#fff',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreText: {
    fontSize: isSmallDevice ? 32 : 40,
    fontWeight: 'bold',
    color: '#4169E1',
  },
  scoreSubtext: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: '500',
    color: '#888',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: scoreCircleSize / 4,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    width: width * 0.28,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  correctCard: {
    borderTopWidth: 3,
    borderTopColor: '#00C853',
  },
  incorrectCard: {
    borderTopWidth: 3,
    borderTopColor: '#FF5252',
  },
  unattemptedCard: {
    borderTopWidth: 3,
    borderTopColor: '#9E9E9E',
  },
  statsLabel: {
    fontSize: isSmallDevice ? 12 : 14,
    color: '#666',
    marginVertical: 8,
    textAlign: 'center',
  },
  statsValue: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: 'bold',
    color: '#333',
  },
  rankContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4169E1',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rankLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  rankText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4169E1',
  },
  shareButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4169E1',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    elevation: 4,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAnswersButton: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4169E1',
  },
});

export default Result;