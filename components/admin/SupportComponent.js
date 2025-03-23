import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar, Dimensions, Modal, PanResponder, Animated, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, where, addDoc, doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { auth } from '../../config/firebase';

const { width } = Dimensions.get('window');
const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

const SupportComponent = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [supportMessages, setSupportMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalExpanded, setModalExpanded] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [menuVisible, setMenuVisible] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = Math.max(-150, Math.min(200, gestureState.dy));
        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeMessage();
        } else if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          setModalExpanded(true);
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
            speed: 12
          }).start();
        } else {
          setModalExpanded(false);
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
            speed: 12
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    fetchSupportMessages();
  }, []);

  const fetchSupportMessages = async () => {
    try {
      setLoading(true);
      const supportRef = collection(db, 'support_messages');
      const q = query(
        supportRef,
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSupportMessages(messages);
    } catch (error) {
      console.error('Error fetching support messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openMessage = (message) => {
    setSelectedMessage(message);
    setIsModalVisible(true);
  };

  const closeMessage = () => {
    setIsModalVisible(false);
    setSelectedMessage(null);
    setModalExpanded(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    
    try {
      const replyRef = collection(db, 'support_replies');
      await addDoc(replyRef, {
        messageId: selectedMessage.id,
        reply: replyText,
        createdAt: serverTimestamp(),
        adminEmail: auth.currentUser.email
      });

      // Update message status to 'resolved'
      const messageRef = doc(db, 'support_messages', selectedMessage.id);
      await updateDoc(messageRef, {
        status: 'resolved'
      });

      // Refresh messages and close modal
      await fetchSupportMessages();
      setReplyText('');
      closeMessage();
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply. Please try again.');
    }
  };

  const handleStatusChange = async (messageId, newStatus) => {
    try {
      const messageRef = doc(db, 'support_messages', messageId);
      await updateDoc(messageRef, {
        status: newStatus
      });
      // Refresh messages after status update
      await fetchSupportMessages();
    } catch (error) {
      console.error('Error updating message status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this message?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const messageRef = doc(db, 'support_messages', messageId);
              await deleteDoc(messageRef);
              await fetchSupportMessages();
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getFilteredMessages = () => {
    if (statusFilter === 'all') return supportMessages;
    return supportMessages.filter(message => message.status === statusFilter);
  };

  const renderMessage = (message) => (
    <TouchableOpacity 
      key={message.id} 
      style={[styles.messageCard, styles[message.status]]}
      onPress={() => {
        setMenuVisible(null);
        openMessage(message);
      }}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.userEmail}>{message.userEmail}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>
            {message.createdAt?.toDate().toLocaleDateString()}
          </Text>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedMessage(message);
              setModalVisible(true);
            }}
          >
            <Text style={styles.menuDots}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.messageSubject}>{message.subject}</Text>
      <Text style={styles.messagePreview} numberOfLines={1}>
        {message.message}
      </Text>
      <View style={styles.statusContainer}>
        <Text style={[styles.status, styles[message.status]]}>
          {message.status.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { marginTop: statusBarHeight }]}>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, statusFilter === 'new' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('new')}
        >
          <Text style={[styles.filterText, statusFilter === 'new' && styles.filterTextActive]}>Unread</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, statusFilter === 'pending' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterText, statusFilter === 'pending' && styles.filterTextActive]}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, statusFilter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('resolved')}
        >
          <Text style={[styles.filterText, statusFilter === 'resolved' && styles.filterTextActive]}>Resolved</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : getFilteredMessages().length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.noMessages}>No {statusFilter} messages found</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent}>
          {getFilteredMessages().map(message => renderMessage(message))}
        </ScrollView>
      )}

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.dismissOverlay} 
            activeOpacity={1} 
            onPress={closeMessage}
          />
          <Animated.View 
            style={[
              styles.modalContent,
              modalExpanded ? styles.modalExpanded : styles.modalCollapsed,
              {
                transform: [{ translateY }]
              }
            ]}
          >
            <View 
              {...panResponder.panHandlers}
              style={styles.dragHandle}
            >
              <View style={styles.dragIndicator} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedMessage?.subject}
              </Text>
              <TouchableOpacity onPress={closeMessage}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalBody}
              bounces={false}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.modalEmail}>{selectedMessage?.userEmail}</Text>
              <Text style={styles.modalDate}>
                {selectedMessage?.createdAt?.toDate().toLocaleDateString()}
              </Text>
              <Text style={styles.modalMessage}>{selectedMessage?.message}</Text>
            </ScrollView>
            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your reply..."
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <TouchableOpacity 
                style={styles.replyButton}
                onPress={handleReply}
              >
                <Text style={styles.replyButtonText}>Send Reply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.actionModalContent, { backgroundColor: '#fff' }]}>
            {selectedMessage && (
              <>
                {selectedMessage.status !== 'pending' && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => {
                      handleStatusChange(selectedMessage.id, 'pending');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.menuItemText}>Mark In Progress</Text>
                  </TouchableOpacity>
                )}
                {selectedMessage.status !== 'resolved' && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => {
                      handleStatusChange(selectedMessage.id, 'resolved');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.menuItemText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    handleDeleteMessage(selectedMessage.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.menuItemText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 4,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E4E9F2',
  },
  new: {
    borderLeftColor: '#2196F3',
  },
  pending: {
    borderLeftColor: '#FF9800',
  },
  resolved: {
    borderLeftColor: '#4CAF50',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E3A59',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: '#8F9BB3',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#8F9BB3',
    fontWeight: 'bold',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E3A59',
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3A59',
    flex: 1,
  },
  closeButton: {
    fontSize: 24,
    color: '#8F9BB3',
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalEmail: {
    fontSize: 15,
    color: '#2196F3',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 13,
    color: '#8F9BB3',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 15,
    color: '#2E3A59',
    lineHeight: 24,
  },
  replyContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
    paddingTop: 20,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: '#2E3A59',
    backgroundColor: '#F7F9FC',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  replyButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  menuItemText: {
    fontSize: 16,
    color: '#2E3A59',
  },
  actionModalContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E4E9F2',
  },
  new: {
    borderLeftColor: '#2196F3',
  },
  pending: {
    borderLeftColor: '#FF9800',
  },
  resolved: {
    borderLeftColor: '#4CAF50',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E3A59',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: '#8F9BB3',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuDots: {
    fontSize: 20,
    color: '#8F9BB3',
    fontWeight: 'bold',
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E3A59',
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#8F9BB3',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E3A59',
    flex: 1,
  },
  closeButton: {
    fontSize: 24,
    color: '#8F9BB3',
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalEmail: {
    fontSize: 15,
    color: '#2196F3',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 13,
    color: '#8F9BB3',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 15,
    color: '#2E3A59',
    lineHeight: 24,
  },
  replyContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E4E9F2',
    paddingTop: 20,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#E4E9F2',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
    color: '#2E3A59',
    backgroundColor: '#F7F9FC',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  replyButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  menuItemText: {
    fontSize: 16,
    color: '#2E3A59',
  },
});

export default SupportComponent;