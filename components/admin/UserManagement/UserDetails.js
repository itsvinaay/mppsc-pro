import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, startAfter, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import ThreeDotsLoader from '../../../components/ThreeDotsLoader';

const PAGE_SIZE = 5;

const UserDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId, isOnline, isActive, status } = params;

  const [user, setUser] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTestDetail, setShowTestDetail] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        Alert.alert('Error', 'User not found');
        return;
      }
      setUser({ id: userDoc.id, ...userDoc.data() });
      await fetchTestHistory();
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestHistory = async () => {
    if (!hasMore) return;

    try {
      const testHistoryRef = collection(db, 'testHistory');
      let testQuery = query(
        testHistoryRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );

      if (lastVisible) {
        testQuery = query(
          testHistoryRef,
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }

      const testSnapshot = await getDocs(testQuery);
      const tests = testSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (testSnapshot.empty) {
        setHasMore(false);
        return;
      }

      setTestHistory(prev => [...prev, ...tests]);
      setLastVisible(testSnapshot.docs[testSnapshot.docs.length - 1]);
      setHasMore(tests.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching test history:', error);
      if (error.code === 'failed-precondition') {
        console.error('Please create the following index:', error.message);
      }
      
      try {
        const simpleQuery = query(collection(db, 'testHistory'), where('userId', '==', userId));
        const simpleSnapshot = await getDocs(simpleQuery);
        const simpleTests = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        simpleTests.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setTestHistory(simpleTests);
        setHasMore(false);
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        Alert.alert('Error', 'Failed to load test history');
      }
    }
  };

  const loadMoreTests = () => fetchTestHistory();

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const formatLastActive = (lastActive) => {
    if (!lastActive) return 'Never';
    try {
      const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
      const diffInMinutes = Math.floor((Date.now() - date) / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
      return formatDate(lastActive);
    } catch (error) {
      return 'Unknown';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setTestHistory([]);
    setLastVisible(null);
    setHasMore(true);
    await fetchUserDetails();
    setRefreshing(false);
  };

  const handleBanUser = async () => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !user?.isBanned,
        bannedAt: !user?.isBanned ? new Date() : null
      });
      setUser(prev => ({
        ...prev,
        isBanned: !prev.isBanned,
        bannedAt: !prev.isBanned ? new Date() : null
      }));
      Alert.alert('Success', `User has been ${!user?.isBanned ? 'banned' : 'unbanned'}`);
    } catch (error) {
      console.error('Error updating user ban status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async () => setShowDeleteConfirmation(true);

  const confirmDeleteUser = async () => {
    try {
      setLoading(true);
      const testHistoryRef = collection(db, 'testHistory');
      const testQuery = query(testHistoryRef, where('userId', '==', userId));
      const testSnapshot = await getDocs(testQuery);
      const deletionPromises = testSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletionPromises);
      await deleteDoc(doc(db, 'users', userId));
      Alert.alert('Success', 'User and all associated data have been deleted', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', 'Failed to delete user');
      setLoading(false);
    }
    setShowDeleteConfirmation(false);
  };

  const TestDetailModal = ({ test, onClose }) => (
    <Modal visible={!!test} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{test?.testName}</Text>
          <ScrollView>
            <Text style={styles.modalText}>Score: {test?.score}%</Text>
            <Text style={styles.modalText}>Category: {test?.categoryName}</Text>
            <Text style={styles.modalText}>Time Spent: {test?.timeSpent || 'N/A'}</Text>
            <Text style={styles.modalText}>Date: {formatDate(test?.timestamp)}</Text>
            <Text style={styles.modalText}>Correct: {test?.correctAnswers || 0}</Text>
            <Text style={styles.modalText}>Incorrect: {test?.incorrectAnswers || 0}</Text>
            <Text style={styles.modalText}>Skipped: {test?.skippedQuestions || 0}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={onClose}>
            <Text style={styles.modalButtonTextPrimary}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const DeleteConfirmationModal = () => (
    <Modal visible={showDeleteConfirmation} animationType="slide" transparent={true} onRequestClose={() => setShowDeleteConfirmation(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete User</Text>
          <Text style={styles.modalText}>Are you sure? This will remove the user and all their test history permanently.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setShowDeleteConfirmation(false)}>
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonPrimary} onPress={confirmDeleteUser}>
              <Text style={styles.modalButtonTextPrimary}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const MembershipCard = ({ membership }) => {
    if (!membership) return null;
    const isActive = membership.endDate && new Date(membership.endDate.toDate()) > new Date();

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Membership</Text>
        <View style={styles.membershipContent}>
          <View style={[styles.membershipStatus, isActive ? styles.activeMembership : styles.expiredMembership]}>
            <MaterialIcons 
              name={isActive ? "verified" : "warning"} 
              size={20} 
              color={isActive ? '#10b981' : '#ef4444'} 
            />
            <Text style={[styles.membershipStatusText, isActive ? styles.activeText : styles.expiredText]}>
              {isActive ? 'Active Premium' : 'Expired'}
            </Text>
          </View>
          <View style={styles.membershipDetails}>
            {[
              { label: 'Plan', value: membership.planName },
              { label: 'Start', value: formatDate(membership.startDate) },
              { label: 'Expires', value: formatDate(membership.endDate), isDate: true, isActive },
              { label: 'Amount', value: `₹${membership.amount}` },
              { label: 'Payment ID', value: membership.paymentId },
            ].map((item, index) => (
              <View key={index} style={styles.membershipRow}>
                <Text style={styles.membershipLabel}>{item.label}</Text>
                <Text style={[
                  styles.membershipValue,
                  item.isDate && (item.isActive ? styles.activeDate : styles.expiredDate)
                ]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThreeDotsLoader color="#4f46e5" size={12} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4f46e5']} />}
      >
        
        <View style={styles.card}>
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.displayName || 'No Name'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.userStatus}>
                <View style={[
                  styles.statusDot,
                  status === 'online' ? styles.statusOnline :
                  status === 'active' ? styles.statusActive :
                  styles.statusInactive
                ]} />
                <Text style={styles.statusText}>{status === 'online' ? 'Online' : status === 'active' ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            {user?.isBanned && (
              <View style={styles.bannedBadge}>
                <MaterialIcons name="block" size={16} color="#ef4444" />
                <Text style={styles.badgeText}>Banned</Text>
              </View>
            )}
          </View>
          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Joined</Text>
              <Text style={styles.statValue}>{formatDate(user?.createdAt)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Last Active</Text>
              <Text style={styles.statValue}>{formatLastActive(user?.lastActive)}</Text>
            </View>
          </View>
          <View style={styles.userActions}>
            <TouchableOpacity 
              style={[styles.actionButton, user?.isBanned && styles.successButton]}
              onPress={handleBanUser}
            >
              <MaterialIcons name={user?.isBanned ? "check-circle" : "block"} size={20} color={user?.isBanned ? '#10b981' : '#ef4444'} />
              <Text style={[styles.actionText, user?.isBanned && styles.successText]}>
                {user?.isBanned ? 'Unban' : 'Ban'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteUser}>
              <MaterialIcons name="delete" size={20} color="#ef4444" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Summary</Text>
          <View style={styles.summaryStats}>
            {[
              { label: 'Tests Taken', value: testHistory.length },
              { label: 'Avg Score', value: testHistory.length > 0 ? `${Math.round(testHistory.reduce((acc, test) => acc + (test.score || 0), 0) / testHistory.length)}%` : 'N/A' },
              { label: 'Best Score', value: testHistory.length > 0 ? `${Math.max(...testHistory.map(test => test.score || 0))}%` : 'N/A' },
            ].map((item, index) => (
              <View key={index} style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test History</Text>
          {testHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="history-toggle-off" size={48} color="#9ca3af" />
              <Text style={styles.emptyStateText}>No test history</Text>
            </View>
          ) : (
            testHistory.map(test => (
              <TouchableOpacity key={test.id} style={styles.historyItem} onPress={() => setShowTestDetail(test)}>
                <View style={styles.historyHeader}>
                  <Text style={styles.testTitle}>{test.testName || 'Unnamed Test'}</Text>
                  <Text style={styles.testScore}>{test.score || 0}%</Text>
                </View>
                <Text style={styles.testCategory}>{test.categoryName || 'Uncategorized'}</Text>
                <View style={styles.testStats}>
                  <Text style={styles.testStatText}>
                    C: {test.correctAnswers || 0} | I: {test.incorrectAnswers || 0} | S: {test.skippedQuestions || 0}
                  </Text>
                  <Text style={styles.testDate}>{formatDate(test.timestamp)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          {hasMore && (
            <TouchableOpacity onPress={loadMoreTests} style={styles.loadMoreButton}>
              <MaterialIcons name="expand-more" size={20} color="#4f46e5" />
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}
        </View>

        <MembershipCard membership={user?.membership} />
        <TestDetailModal test={showTestDetail} onClose={() => setShowTestDetail(null)} />
        <DeleteConfirmationModal />
      </ScrollView>
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
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
  bannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
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
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
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
  successButton: {
    backgroundColor: '#dcfce7',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  successText: {
    color: '#10b981',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4f46e5',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  testScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  testCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  testStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testStatText: {
    fontSize: 12,
    color: '#6b7280',
  },
  testDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  loadMoreText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '500',
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
  membershipContent: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  membershipStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activeMembership: {
    backgroundColor: '#dcfce7',
  },
  expiredMembership: {
    backgroundColor: '#fee2e2',
  },
  membershipStatusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  activeText: { color: '#10b981' },
  expiredText: { color: '#ef4444' },
  membershipDetails: {
    padding: 12,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  membershipLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  membershipValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  activeDate: { color: '#10b981' },
  expiredDate: { color: '#ef4444' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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

export default UserDetails;