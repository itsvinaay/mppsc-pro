import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'react-native';

const { width } = Dimensions.get('window');

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [timeFrame, setTimeFrame] = useState('all');
  const [category, setCategory] = useState('overall');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = auth;
  const [userRank, setUserRank] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    fetchCategories();
    fetchLeaderboardData();
  }, [timeFrame, category, searchQuery]);

  const fetchCategories = async () => {
    try {
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      setError({
        message: 'Failed to load categories',
        details: error.message,
        retry: () => fetchCategories(),
      });
    }
  };

  const fetchLeaderboardData = async (loadMore = false) => {
    try {
      if (!loadMore) setLoading(true);
      setError(null);

      const usersRef = collection(db, 'users');
      const constraints = [where('testsTaken', '>', 0)];

      if (timeFrame !== 'all') {
        const date = new Date();
        if (timeFrame === 'month') date.setMonth(date.getMonth() - 1);
        else if (timeFrame === 'week') date.setDate(date.getDate() - 7);
        constraints.push(where('lastTestDate', '>=', date));
      }

      if (category !== 'overall') {
        constraints.push(where(`categoryScores.${category}.taken`, '>', 0));
      }

      if (searchQuery.trim()) {
        constraints.push(where('displayName', '>=', searchQuery));
        constraints.push(where('displayName', '<=', searchQuery + '\uf8ff'));
      }

      const leaderboardQuery = query(
        usersRef,
        ...constraints,
        orderBy(category === 'overall' ? 'highestScore' : `categoryScores.${category}.average`, 'desc'),
        limit(USERS_PER_PAGE * (loadMore ? page : 1))
      );

      const snapshot = await getDocs(leaderboardQuery);

      if (snapshot.empty && !loadMore) {
        setLeaderboardData([]);
        setHasMore(false);
        return;
      }

      const data = snapshot.docs.map((doc, index) => {
        const userData = doc.data();
        const score = category === 'overall'
          ? userData.highestScore || 0
          : userData.categoryScores?.[category]?.average || 0;

        if (doc.id === currentUser?.uid) setUserRank(index + 1);

        return {
          id: doc.id,
          rank: index + 1,
          name: userData.displayName || 'Anonymous',
          photoURL: userData.photoURL,
          score,
          testsTaken: category === 'overall'
            ? userData.testsTaken || 0
            : userData.categoryScores?.[category]?.taken || 0,
        };
      });

      setHasMore(data.length === USERS_PER_PAGE * page);
      setLeaderboardData(loadMore ? data : data.slice(0, USERS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message);
      setError({
        message: 'Unable to load leaderboard',
        details: error.message,
        retry: () => fetchLeaderboardData(loadMore),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchLeaderboardData();
  }, [timeFrame, category, searchQuery]);

  const loadMore = () => {
    if (hasMore && !loading && !refreshing) {
      setPage(prev => prev + 1);
      fetchLeaderboardData(true);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setPage(1);
  };

  const renderTopThree = () => {
    if (!leaderboardData.length) return null;
    const topThree = leaderboardData.slice(0, 3);
    const orderedPositions = [1, 0, 2]; // Silver, Gold, Bronze

    return (
      <LinearGradient colors={['#E8F5E9', '#F5F5F5']} style={styles.topThreeContainer}>
        {orderedPositions.map((position) => {
          const user = topThree[position];
          if (!user) return null;

          const isFirst = position === 0;
          const medalColors = { 0: '#FFD700', 1: '#C0C0C0', 2: '#CD7F32' };
          const rankLabels = { 0: '1st', 1: '2nd', 2: '3rd' };

          return (
            <View
              key={position}
              style={[styles.topThreeItem, isFirst && styles.firstPlace]}
            >
              {isFirst && <Ionicons name="trophy" size={24} color="#FFD700" style={styles.crown} />}
              <LinearGradient
                colors={[medalColors[position], '#FFF']}
                style={[styles.avatarGradient, isFirst && styles.firstPlaceGradient]}
              >
                <View style={[styles.topThreeAvatar, isFirst && styles.firstPlaceAvatar]}>
                  <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
                </View>
              </LinearGradient>
              <Text style={styles.topThreeName} numberOfLines={1}>{user.name}</Text>
              <Text style={[styles.topThreeScore, { color: medalColors[position] }]}>
                {user.score.toFixed(1)}%
              </Text>
              <Text style={styles.testsCount}>{user.testsTaken} Tests</Text>
            </View>
          );
        })}
      </LinearGradient>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="trophy-outline" size={60} color="#B0BEC5" />
      <Text style={styles.emptyStateText}>
        {searchQuery.trim() ? `No users found for "${searchQuery}"` : 'No leaderboard data available'}
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSearchQuery('');
          setCategory('overall');
          setTimeFrame('all');
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={50} color="#EF5350" />
      <Text style={styles.errorText}>{error?.message}</Text>
      {error?.details && <Text style={styles.errorDetails}>{error.details}</Text>}
      <TouchableOpacity style={styles.retryButton} onPress={error?.retry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
      <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="trophy" size={28} color="#FFF" />
          <Text style={styles.headerTitle}>Leaderboard</Text>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#78909C" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#B0BEC5"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color="#78909C" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[{ id: 'overall', name: 'Overall' }, ...categories].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, category === cat.id && styles.filterChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[styles.filterChipText, category === cat.id && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.timeFrameContainer}>
          {['week', 'month', 'all'].map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.timeFrameButton, timeFrame === time && styles.timeFrameButtonActive]}
              onPress={() => setTimeFrame(time)}
            >
              <Text style={[styles.timeFrameText, timeFrame === time && styles.timeFrameTextActive]}>
                {time === 'all' ? 'All Time' : time.charAt(0).toUpperCase() + time.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            progressBackgroundColor="#FFF"
            tintColor="#4CAF50"
          />
        }
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50) loadMore();
        }}
        scrollEventThrottle={16}
      >
        {loading && !leaderboardData.length ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading Leaderboard...</Text>
          </View>
        ) : error ? (
          renderErrorState()
        ) : (
          <>
            {renderTopThree()}
            {leaderboardData.length > 0 ? (
              <View style={styles.listContainer}>
                {leaderboardData.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.leaderboardItem, item.id === currentUser?.uid && styles.currentUserItem]}
                  >
                    <Text style={styles.rankNumber}>#{item.rank}</Text>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.userTests}>{item.testsTaken} Tests</Text>
                    </View>
                    <Text style={styles.score}>{item.score.toFixed(1)}%</Text>
                  </View>
                ))}
                {loading && hasMore && (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                )}
                {!hasMore && leaderboardData.length >= USERS_PER_PAGE && (
                  <Text style={styles.endOfListText}>— End of Leaderboard —</Text>
                )}
              </View>
            ) : (
              renderEmptyState()
            )}
          </>
        )}
      </ScrollView>

      {userRank && userRank > 3 && (
        <LinearGradient colors={['#388E3C', '#2E7D32']} style={styles.currentUserBar}>
          <View style={styles.currentUserContent}>
            <View style={styles.currentUserAvatarCircle}>
              <Text style={styles.currentUserAvatarText}>
                {currentUser?.displayName?.charAt(0) || 'Y'}
              </Text>
            </View>
            <View style={styles.currentUserInfo}>
              <Text style={styles.currentUserRank}>Rank #{userRank}</Text>
              <Text style={styles.currentUserName} numberOfLines={1}>{currentUser?.displayName || 'You'}</Text>
            </View>
            <Text style={styles.currentUserScore}>
              {leaderboardData.find(item => item.id === currentUser?.uid)?.score.toFixed(1)}%
            </Text>
          </View>
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8,
  },
  filtersContainer: {
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  timeFrameContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 4,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  timeFrameButtonActive: {
    backgroundColor: '#FFF',
    elevation: 1,
  },
  timeFrameText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeFrameTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 80,
    paddingHorizontal: 12,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    elevation: 2,
  },
  topThreeItem: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: width * 0.25,
  },
  firstPlace: {
    width: width * 0.3,
    transform: [{ translateY: -15 }],
  },
  crown: {
    marginBottom: 8,
  },
  avatarGradient: {
    padding: 3,
    borderRadius: 40,
  },
  firstPlaceGradient: {
    padding: 4,
  },
  topThreeAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstPlaceAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#555',
  },
  topThreeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginVertical: 6,
  },
  topThreeScore: {
    fontSize: 18,
    fontWeight: '700',
  },
  testsCount: {
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 12,
    padding: 8,
    elevation: 2,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  currentUserItem: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  rankNumber: {
    width: 40,
    fontSize: 16,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userTests: {
    fontSize: 12,
    color: '#666',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  currentUserBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 4,
  },
  currentUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  currentUserAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  currentUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  currentUserRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  currentUserName: {
    fontSize: 12,
    color: '#E8F5E9',
  },
  currentUserScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  endOfListText: {
    textAlign: 'center',
    padding: 12,
    fontSize: 14,
    color: '#B0BEC5',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  resetButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#EF5350',
    textAlign: 'center',
    marginVertical: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Leaderboard;