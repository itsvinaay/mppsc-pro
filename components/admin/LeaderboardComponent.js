import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Dimensions, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import ThreeDotsLoader from '../../components/ThreeDotsLoader';

const { width } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const Leaderboard = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [error, setError] = useState(null);

  const fetchLeaderboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersMap = new Map();
      
      usersSnapshot.forEach(doc => {
        usersMap.set(doc.id, {
          id: doc.id,
          displayName: doc.data().displayName || 'Anonymous',
          email: doc.data().email || ''
        });
      });

      const testHistoryRef = collection(db, 'testHistory');
      const testSnapshot = await getDocs(testHistoryRef);
      
      const userStats = new Map();
      
      testSnapshot.forEach(doc => {
        const test = doc.data();
        if (!test.userId || typeof test.percentage !== 'number') return;

        if (!userStats.has(test.userId)) {
          userStats.set(test.userId, {
            totalScore: 0,
            testsCount: 0,
            highestScore: 0,
            totalTime: 0
          });
        }

        const stats = userStats.get(test.userId);
        stats.totalScore += test.percentage;
        stats.testsCount += 1;
        stats.highestScore = Math.max(stats.highestScore, test.percentage);
        stats.totalTime += test.timeTaken || 0;
      });

      const leaderboard = Array.from(userStats.entries())
        .filter(([userId]) => usersMap.has(userId))
        .map(([userId, stats]) => ({
          ...usersMap.get(userId),
          stats: {
            ...stats,
            averageScore: stats.testsCount > 0 
              ? Math.round(stats.totalScore / stats.testsCount) 
              : 0
          }
        }))
        .sort((a, b) => b.stats.averageScore - a.stats.averageScore);

      setLeaderboardData(leaderboard);
      setError(null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Oops! Something went wrong 😢');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  const onRefresh = useCallback(() => {
    fetchLeaderboardData(true);
  }, [fetchLeaderboardData]);

  const getSmiley = (rank) => {
    switch (rank) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '😊';
    }
  };

  return (
    <View style={styles.container}>
     

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThreeDotsLoader color="#FF5722" size={12} />
          <Text style={styles.loadingText}>Getting ready... 😊</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😢</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchLeaderboardData()}
          >
            <Text style={styles.retryButtonText}>Try Again! 😄</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF5722"
              colors={['#FF5722']}
            />
          }
        >
          {leaderboardData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyText}>No champs yet! Be the first! 😊</Text>
            </View>
          ) : (
            leaderboardData.map((user, index) => (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userCard,
                  index < 3 && styles.topUserCard
                ]}
                onPress={() => router.push({
                  pathname: '/userDetail',
                  params: { userId: user.id }
                })}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    index === 0 ? ['#FFD700', '#FFCA28'] :
                    index === 1 ? ['#E0E0E0', '#B0BEC5'] :
                    index === 2 ? ['#FF8A65', '#FF5722'] :
                    ['#81C784', '#4CAF50']
                  }
                  style={styles.cardGradient}
                >
                  <View style={styles.rankContainer}>
                    <Text style={styles.rankEmoji}>{getSmiley(index)}</Text>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text numberOfLines={1} style={styles.userName}>
                      {user.displayName}
                    </Text>
                    <View style={styles.statsRow}>
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{user.stats.averageScore}%</Text>
                        <Text style={styles.statLabel}>AVG</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{user.stats.highestScore}%</Text>
                        <Text style={styles.statLabel}>BEST</Text>
                      </View>
                      <View style={styles.stat}>
                        <Text style={styles.statValue}>{user.stats.testsCount}</Text>
                        <Text style={styles.statLabel}>PLAYS</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF3E0',
  },
  header: {
    paddingTop: statusBarHeight + 10,
    paddingBottom: 15,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 60,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  topUserCard: {
    elevation: 5,
    shadowOpacity: 0.3,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
  },
  rankContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 20,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    maxWidth: width - 120,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 8,
    borderRadius: 10,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D81B60',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyEmoji: {
    fontSize: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500',
  },
});

export default Leaderboard;