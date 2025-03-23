import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, RefreshControl, Modal, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where, onSnapshot, doc, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { MaterialIcons } from '@expo/vector-icons';
import { debounce } from 'lodash';

const UserManagement = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  
  // Uncomment and fix the debounced search implementation
  const debouncedSearch = useCallback(debounce((text) => setSearchQuery(text), 300), []);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    dailyActiveUsers: [],
    testCompletions: [],
    averageScores: []
  });
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const formatDate = (date) => {
    if (!date) return 'Never';
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        date = date.toDate();
      }
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchUsersAndStats();
    fetchAnalytics();

    const unsubscribe = onSnapshot(collection(db, 'userStatus'), (snapshot) => {
      const onlineUserIds = new Set();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.state === 'online' && data.lastSeen) {
          const lastSeen = data.lastSeen.toDate();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (lastSeen > fiveMinutesAgo) {
            onlineUserIds.add(doc.id);
          }
        }
      });
      setOnlineUsers(onlineUserIds);
    });

    return () => unsubscribe();
  }, []);

  const fetchUsersAndStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const usersData = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data() || {};
        usersData.push({ 
          id: doc.id, 
          ...userData,
          displayName: userData.displayName || 'No Name',
          email: userData.email || 'No Email',
          lastActive: userData.lastActive || null,
          testsTaken: parseInt(userData.testsTaken || 0),
          totalScore: parseFloat(userData.totalScore || 0),
          averageScore: userData.testsTaken > 0 
            ? Math.round((userData.totalScore || 0) / userData.testsTaken * 100) / 100
            : 0
        });
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const analyticsRef = collection(db, 'analytics');
      const q = query(analyticsRef, where('date', '>=', thirtyDaysAgo), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate()
      }));

      if (data.length === 0) {
        const defaultData = Array(7).fill(0).map((_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
          activeUsers: 0,
          testsCompleted: 0,
          averageScore: 0
        }));
        
        setAnalyticsData({
          dailyActiveUsers: defaultData.map(d => ({ date: d.date, value: d.activeUsers })),
          testCompletions: defaultData.map(d => ({ date: d.date, value: d.testsCompleted })),
          averageScores: defaultData.map(d => ({ date: d.date, value: d.averageScore }))
        });
        return;
      }

      setAnalyticsData({
        dailyActiveUsers: data.map(d => ({ date: d.date, value: d.activeUsers || 0 })),
        testCompletions: data.map(d => ({ date: d.date, value: d.testsCompleted || 0 })),
        averageScores: data.map(d => ({ date: d.date, value: d.averageScore || 0 }))
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      const defaultData = Array(7).fill(0).map((_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
        value: 0
      }));
      
      setAnalyticsData({
        dailyActiveUsers: defaultData,
        testCompletions: defaultData,
        averageScores: defaultData
      });
    }
  };

  // const isUserActive = useCallback((lastActive) => {
  //   if (!lastActive) return false;
  //   try {
  //     let lastActiveDate = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
  //     const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  //     return lastActiveDate > thirtyDaysAgo;
  //   } catch (error) {
  //     return false;
  //   }
  // }, []);
  const isUserActive = useCallback((lastActive) => {
    if (!lastActive) return false;
    try {
      let lastActiveDate;
      if (lastActive.toDate && typeof lastActive.toDate === 'function') {
        lastActiveDate = lastActive.toDate();
      } else if (lastActive instanceof Date) {
        lastActiveDate = lastActive;
      } else {
        lastActiveDate = new Date(lastActive);
      }
      
      // Consider a user active if they've been active in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastActiveDate > thirtyDaysAgo;
    } catch (error) {
      console.error('Error checking user active status:', error);
      return false;
    }
  }, []);

  const isUserOnline = useCallback((userId) => onlineUsers.has(userId), [onlineUsers]);

const getUserStatus = useCallback((user) => {
    if (!user) return 'inactive';
    
    // First check if user is currently online
    if (isUserOnline(user.id)) return 'online';
    
    // Then check if they've been active recently
    if (isUserActive(user.lastActive)) return 'active';
    
    // Otherwise they're inactive
    return 'inactive';
  }, [isUserOnline, isUserActive]);


  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    if (searchQuery) {
      result = result.filter(user => 
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (selectedFilter) {
      case 'active':
        result = result.filter(user => isUserOnline(user.id) || isUserActive(user.lastActive));
        break;
      case 'inactive':
        result = result.filter(user => !isUserOnline(user.id) && !isUserActive(user.lastActive));
        break;
      case 'premium':
        result = result.filter(user => 
          user?.membership?.endDate && new Date(user.membership.endDate.toDate()) > new Date()
        );
        break;
      case 'expired':
        result = result.filter(user => 
          user?.membership?.endDate && new Date(user.membership.endDate.toDate()) <= new Date()
        );
        break;
    }

    result.sort((a, b) => {
      const aOnline = isUserOnline(a.id);
      const bOnline = isUserOnline(b.id);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      const dateA = a.lastActive ? (a.lastActive.toDate ? a.lastActive.toDate() : new Date(a.lastActive)) : new Date(0);
      const dateB = b.lastActive ? (b.lastActive.toDate ? b.lastActive.toDate() : new Date(b.lastActive)) : new Date(0);
      return dateB - dateA;
    });

    return result;
  }, [users, searchQuery, selectedFilter, isUserOnline, isUserActive]);

  const userStats = useMemo(() => {
    const adminUsers = users.filter(user => user?.isAdmin);
    const activeUsers = users.filter(user => isUserOnline(user.id) || isUserActive(user.lastActive));
    const activeAdmins = adminUsers.filter(user => isUserOnline(user.id) || isUserActive(user.lastActive));
    const premiumUsers = users.filter(user => 
      user?.membership?.endDate && new Date(user.membership.endDate.toDate()) > new Date()
    );
    
    return {
      total: users.length,
      active: activeUsers.length,
      inactive: users.length - activeUsers.length,
      admins: adminUsers.length,
      activeAdmins: activeAdmins.length,
      premium: premiumUsers.length,
    };
  }, [users, isUserActive, isUserOnline]);

  const formatChartDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getLast7DaysData = (data) => {
    if (!data || data.length === 0) {
      return Array(7).fill({ date: new Date(), value: 0 });
    }
    const last7Days = data.slice(-7);
    while (last7Days.length < 7) {
      last7Days.unshift({
        date: new Date(last7Days[0]?.date.getTime() - 24*60*60*1000 || Date.now()),
        value: 0
      });
    }
    return last7Days;
  };

  const calculateAnalyticsStats = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return { avg: 0, max: 0, min: 0, total: 0 };
    const values = dataArray.map(item => item.value || 0);
    const total = values.reduce((sum, val) => sum + val, 0);
    return {
      avg: Math.round(total / values.length * 10) / 10,
      max: Math.max(...values),
      min: Math.min(...values),
      total
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUsersAndStats();
      await fetchAnalytics();
    } catch (error) {
      setError('Failed to refresh. Pull down to try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const TextBasedAnalytics = () => {
    const last7DaysUsers = getLast7DaysData(analyticsData.dailyActiveUsers);
    const last7DaysTests = getLast7DaysData(analyticsData.testCompletions);
    const last7DaysScores = getLast7DaysData(analyticsData.averageScores);
    
    const userStats = calculateAnalyticsStats(last7DaysUsers);
    const testStats = calculateAnalyticsStats(last7DaysTests);
    const scoreStats = calculateAnalyticsStats(last7DaysScores);
    
    return (
      <View style={styles.analyticsContainer}>
        <Text style={styles.analyticsTitle}>User Analytics</Text>
        <Text style={styles.analyticsSubtitle}>Last 7 Days Performance</Text>
        
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsCardTitle}>Daily Active Users</Text>
          <View style={styles.analyticsStatsRow}>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Avg</Text><Text style={styles.analyticsStatValue}>{userStats.avg}</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Max</Text><Text style={styles.analyticsStatValue}>{userStats.max}</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Total</Text><Text style={styles.analyticsStatValue}>{userStats.total}</Text></View>
          </View>
          <View style={styles.analyticsDetailBox}>
            {last7DaysUsers.map((day, index) => (
              <View key={index} style={styles.analyticsDetailRow}>
                <Text style={styles.analyticsDetailDate}>{formatChartDate(day.date)}:</Text>
                <Text style={styles.analyticsDetailValue}>{day.value} users</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsCardTitle}>Daily Test Completions</Text>
          <View style={styles.analyticsStatsRow}>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Avg</Text><Text style={styles.analyticsStatValue}>{testStats.avg}</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Max</Text><Text style={styles.analyticsStatValue}>{testStats.max}</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Total</Text><Text style={styles.analyticsStatValue}>{testStats.total}</Text></View>
          </View>
          <View style={styles.analyticsDetailBox}>
            {last7DaysTests.map((day, index) => (
              <View key={index} style={styles.analyticsDetailRow}>
                <Text style={styles.analyticsDetailDate}>{formatChartDate(day.date)}:</Text>
                <Text style={styles.analyticsDetailValue}>{day.value} tests</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsCardTitle}>Average Test Scores</Text>
          <View style={styles.analyticsStatsRow}>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Avg</Text><Text style={styles.analyticsStatValue}>{scoreStats.avg}%</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Max</Text><Text style={styles.analyticsStatValue}>{scoreStats.max}%</Text></View>
            <View style={styles.analyticsStat}><Text style={styles.analyticsStatLabel}>Min</Text><Text style={styles.analyticsStatValue}>{scoreStats.min}%</Text></View>
          </View>
          <View style={styles.analyticsDetailBox}>
            {last7DaysScores.map((day, index) => (
              <View key={index} style={styles.analyticsDetailRow}>
                <Text style={styles.analyticsDetailDate}>{formatChartDate(day.date)}:</Text>
                <Text style={styles.analyticsDetailValue}>{day.value}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedUser) return;
    try {
      setSendingMessage(true);
      await addDoc(collection(db, 'messages'), {
        to: selectedUser.id,
        text: messageText.trim(),
        sentAt: serverTimestamp(),
        read: false,
        fromAdmin: true,
        senderName: 'Admin'
      });
      setMessageText('');
      setMessageModalVisible(false);
      Alert.alert('Success', 'Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4f46e5']}
            tintColor="#4f46e5"
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>
            {userStats.total} Total Users • {userStats.active} Active
          </Text>
        </View>

        <View style={styles.statsCards}>
          {[
            { label: 'Total Users', value: userStats.total, color: '#4f46e5' },
            { label: 'Active Users', value: userStats.active, color: '#10b981' },
            { label: 'Premium Users', value: userStats.premium, color: '#f59e0b' },
            { label: 'Admins', value: userStats.admins, color: '#8b5cf6', subtext: `(${userStats.activeAdmins} active)` },
          ].map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Text style={styles.statCardValue}>{stat.value}</Text>
              <Text style={styles.statCardLabel}>{stat.label}</Text>
              {stat.subtext && <Text style={styles.statCardSubtext}>{stat.subtext}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.controlSection}>
          // In the return statement, update the search input:
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text); // Update immediately for UI feedback
                debouncedSearch(text); // Debounce for filtering
              }}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#6b7280" style={styles.clearIcon} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { id: 'all', label: 'All', icon: 'people' },
              { id: 'active', label: 'Active', icon: 'person' },
              { id: 'inactive', label: 'Inactive', icon: 'person-off' },
              { id: 'premium', label: 'Premium', icon: 'star' },
              { id: 'expired', label: 'Expired', icon: 'timer-off' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.id && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter.id)}
              >
                <MaterialIcons 
                  name={filter.icon} 
                  size={16} 
                  color={selectedFilter === filter.id ? '#fff' : '#6b7280'} 
                />
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === filter.id && styles.filterButtonTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.analyticsToggle}
          onPress={() => setShowAnalytics(!showAnalytics)}
        >
          <MaterialIcons 
            name={showAnalytics ? 'visibility-off' : 'analytics'} 
            size={20} 
            color="#4f46e5" 
          />
          <Text style={styles.analyticsToggleText}>
            {showAnalytics ? 'Hide Analytics' : 'View Analytics'}
          </Text>
        </TouchableOpacity>

        {showAnalytics && <TextBasedAnalytics />}

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={styles.loading} />
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No users found</Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredUsers.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.displayName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userStatus}>
                    <View style={[
                      styles.statusDot,
                      isUserOnline(user.id) ? styles.statusOnline :
                      isUserActive(user.lastActive) ? styles.statusActive :
                      styles.statusInactive
                    ]} />
                    <Text style={styles.statusText}>
                      {isUserOnline(user.id) ? 'Online' : 
                       isUserActive(user.lastActive) ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={styles.userBadges}>
                  {user.isAdmin && (
                    <View style={styles.adminBadge}>
                      <MaterialIcons name="admin-panel-settings" size={16} color="#8b5cf6" />
                      <Text style={styles.badgeText}>Admin</Text>
                    </View>
                  )}
                  {user?.membership?.endDate && new Date(user.membership.endDate.toDate()) > new Date() && (
                    <View style={styles.premiumBadge}>
                      <MaterialIcons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.badgeText}>Premium</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.userStats}>
                {[
                  { label: 'Tests', value: user.testsTaken || 0 },
                  { label: 'Avg Score', value: user.averageScore ? `${user.averageScore}%` : 'N/A' },
                  { label: 'Last Active', value: formatDate(user.lastActive) },
                ].map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedUser(user);
                    setMessageModalVisible(true);
                  }}
                >
                  <MaterialIcons name="message" size={20} color="#4f46e5" />
                  <Text style={styles.actionText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push({
                    pathname: '/userDetail',
                    params: { userId: user.id }
                  })}
                >
                  <MaterialIcons name="visibility" size={20} color="#4f46e5" />
                  <Text style={styles.actionText}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={messageModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Message {selectedUser?.displayName}
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setMessageModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  !messageText.trim() && styles.modalButtonDisabled
                ]}
                onPress={sendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {sendingMessage ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statCardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statCardSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  controlSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  clearIcon: {
    marginLeft: 8,
  },
  filterScroll: {
    paddingVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  analyticsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 4,
    gap: 8,
  },
  analyticsToggleText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '500',
  },
  analyticsContainer: {
    marginBottom: 24,
  },
  analyticsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
  },
  analyticsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  analyticsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsStat: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  analyticsStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  analyticsDetailBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 12,
  },
  analyticsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  analyticsDetailDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  analyticsDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  userCard: {
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
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOnline: { backgroundColor: '#10b981' },
  statusActive: { backgroundColor: '#4f46e5' },
  statusInactive: { backgroundColor: '#9ca3af' },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
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
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginVertical: 16,
  },
  resetButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loading: {
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    backgroundColor: '#fff',
    marginBottom: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
  modalButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UserManagement;