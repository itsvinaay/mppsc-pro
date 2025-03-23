import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth, db } from '../../../config/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, orderBy, limit } from 'firebase/firestore';
import { colors } from '../../../constants/styles'; // Assuming colors is defined here

export default function Profile() {
  const user = auth.currentUser;

  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false); // Added missing state
  const [newName, setNewName] = useState(user?.displayName || ''); // Renamed for clarity
  const [newPhone, setNewPhone] = useState(''); // Renamed for clarity
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userStats, setUserStats] = useState({
    testsTaken: 0,
    highestScore: 0,
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [testHistoryVisible, setTestHistoryVisible] = useState(false);
  const [testHistory, setTestHistory] = useState<TestHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Handle name update
  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;
    try {
      await updateProfile(user, { displayName: newName.trim() });
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { displayName: newName.trim(), updatedAt: new Date() }, { merge: true });
      setIsEditingName(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  // Handle phone update
  const handleUpdatePhone = async () => {
    if (!user || !newPhone.trim()) return;
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(newPhone.trim())) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { phoneNumber: newPhone.trim(), updatedAt: new Date() }, { merge: true });
      setPhoneNumber(newPhone.trim());
      setIsEditingPhone(false);
      Alert.alert('Success', 'Phone number updated');
    } catch (error) {
      console.error('Error updating phone:', error);
      Alert.alert('Error', 'Failed to update phone');
    }
  };

  // Handle admin status
  const setAdminStatus = async () => {
    if (!user || isAdmin) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { role: 'admin', updatedAt: new Date() }, { merge: true });
      setIsAdmin(true);
      Alert.alert('Success', 'Admin privileges granted');
    } catch (error) {
      console.error('Error setting admin status:', error);
      Alert.alert('Error', 'Failed to grant admin status');
    }
  };

  // Fetch test history
  const fetchTestHistory = async () => {
    if (!user) return;
    try {
      setLoadingHistory(true);
      const testsQuery = query(
        collection(db, 'testHistory'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      const testsSnapshot = await getDocs(testsQuery);
      const tests: TestHistory[] = testsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testName: data.testName || 'Unnamed Test',
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 0,
          correctAnswers: data.correctAnswers || 0,
          category: data.category || 'General',
          date: data.timestamp ? data.timestamp.toDate() : new Date(),
        };
      });

      setTestHistory(tests);
    } catch (error) {
      console.error('Error fetching test history:', error);
      Alert.alert('Error', 'Failed to load test history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        setIsAdmin(userData?.role === 'admin');
        setPhoneNumber(userData?.phoneNumber || '');
        setNewPhone(userData?.phoneNumber || '');
        setNewName(user?.displayName || ''); // Sync with auth profile

        const testsQuery = query(collection(db, 'testHistory'), where('userId', '==', user.uid));
        const testsSnapshot = await getDocs(testsQuery);
        let totalScore = 0,
          highestScore = 0;

        testsSnapshot.forEach(doc => {
          const score = doc.data().score || 0;
          totalScore += score;
          highestScore = Math.max(highestScore, score);
        });

        setUserStats({
          testsTaken: testsSnapshot.size,
          highestScore: Math.round(highestScore),
          averageScore: testsSnapshot.size > 0 ? Math.round(totalScore / testsSnapshot.size) : 0,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.displayName?.[0] || user?.email?.[0] || 'U'}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isLoading ? '...' : userStats.testsTaken}</Text>
              <Text style={styles.statLabel}>Tests</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isLoading ? '...' : userStats.highestScore}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isLoading ? '...' : `${userStats.averageScore}%`}</Text>
              <Text style={styles.statLabel}>Avg</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              fetchTestHistory();
              setTestHistoryVisible(true);
            }}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
            <Text style={styles.historyButtonText}>View Test History</Text>
          </TouchableOpacity>

          {isAdmin ? (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => router.push('/(protected)/(adminPanel)/adminPanel')}
            >
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.adminButton} onPress={setAdminStatus}>
              <Ionicons name="shield" size={20} color="#fff" />
              <Text style={styles.adminButtonText}>Request Admin</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#007AFF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              {isEditingName ? (
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />
              ) : (
                <Text style={styles.infoValue}>{user?.displayName || 'Not set'}</Text>
              )}
            </View>
            <TouchableOpacity onPress={isEditingName ? handleUpdateName : () => setIsEditingName(true)}>
              <Ionicons
                name={isEditingName ? 'checkmark' : 'create-outline'}
                size={20}
                color={isEditingName ? '#4CAF50' : '#999'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color="#007AFF" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {isEditingPhone ? (
                <TextInput
                  style={styles.input}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              ) : (
                <Text style={styles.infoValue}>{phoneNumber || 'Not set'}</Text>
              )}
            </View>
            <TouchableOpacity onPress={isEditingPhone ? handleUpdatePhone : () => setIsEditingPhone(true)}>
              <Ionicons
                name={isEditingPhone ? 'checkmark' : 'create-outline'}
                size={20}
                color={isEditingPhone ? '#4CAF50' : '#999'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={() => setSignOutModalVisible(true)}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sign Out Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={signOutModalVisible}
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setSignOutModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSignOut}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Test History Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={testHistoryVisible}
        onRequestClose={() => setTestHistoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.historyModalContent]}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Test History</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setTestHistoryVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your test history...</Text>
              </View>
            ) : testHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No test history found</Text>
                <Text style={styles.emptySubtext}>Take a test to see your results here</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList}>
                {testHistory.map(test => (
                  <View key={test.id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemTitle}>{test.testName}</Text>
                      <View
                        style={[
                          styles.scoreBadge,
                          test.score >= 70
                            ? styles.highScore
                            : test.score >= 40
                            ? styles.mediumScore
                            : styles.lowScore,
                        ]}
                      >
                        <Text style={styles.scoreBadgeText}>{test.score}%</Text>
                      </View>
                    </View>

                    <View style={styles.historyItemDetails}>
                      <Text style={styles.historyItemCategory}>{test.category}</Text>
                      <Text style={styles.historyItemDate}>
                        {test.date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    <View style={styles.historyItemStats}>
                      <View style={styles.historyItemStat}>
                        <Ionicons name="help-circle-outline" size={16} color="#666" />
                        <Text style={styles.historyItemStatText}>{test.totalQuestions} Questions</Text>
                      </View>
                      <View style={styles.historyItemStat}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                        <Text style={styles.historyItemStatText}>{test.correctAnswers} Correct</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.viewDetailsButton}
                      // onPress={() =>
                      //   router.push({
                      //     pathname: '/(protected)/test-result',
                      //     params: { testId: test.id },
                      //   })
                      // }
                    >
                      <Text style={styles.viewDetailsButtonText}>View Details</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#ddd',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  adminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIcon: {
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
  },
  input: {
    fontSize: 16,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 30,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  historyModalContent: {
    height: '80%',
    maxHeight: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButtonText: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  highScore: {
    backgroundColor: '#E3F2FD',
  },
  mediumScore: {
    backgroundColor: '#FFF9C4',
  },
  lowScore: {
    backgroundColor: '#FFEBEE',
  },
  scoreBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  historyItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyItemCategory: {
    fontSize: 14,
    color: '#666',
  },
  historyItemDate: {
    fontSize: 14,
    color: '#666',
  },
  historyItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemStatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: 5,
  },
});

// Define the TestHistory interface
interface TestHistory {
  id: string;
  testName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  category: string;
  date: Date;
}