import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  getDoc, 
  doc, 
  onSnapshot, 
  writeBatch, 
  updateDoc,
  deleteDoc,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useNavigation } from '@react-navigation/native';
import ThreeDotsLoader from '../../../components/ThreeDotsLoader';

// Type definitions
interface Notification {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
  read?: boolean;
  createdAt?: any; // Firestore Timestamp
  supportMessageId?: string;
  supportMessage?: SupportMessage;
  supportReply?: string | null;
}

interface SupportMessage {
  id: string;
  content?: string;
  reply?: string;
  createdAt?: any;
}

interface Filters {
  type: string | null;
  priority: string | null;
  category: string | null;
  read: boolean | null;
  categoryGroup: string | null;
}

interface Preferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  categories: {
    academic: boolean;
    administrative: boolean;
    library: boolean;
    events: boolean;
    facility: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface Analytics {
  totalReceived: number;
  readRate: number;
  categoryBreakdown: Record<string, number>;
  responseTime: number;
}

function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [deletedNotification, setDeletedNotification] = useState<Notification | null>(null);
  const [showUndoDelete, setShowUndoDelete] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [supportReplies, setSupportReplies] = useState<SupportMessage[] | undefined>();
  const [filters, setFilters] = useState<Filters>({
    type: null,
    priority: null,
    category: null,
    read: null,
    categoryGroup: null
  });
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  const navigation = useNavigation();

  const categoryFilters: Record<string, string[]> = {
    academic: ['homework', 'exam', 'grade', 'test'],
    administrative: ['announcement', 'schedule', 'attendance'],
    library: ['book', 'return_reminder', 'fine'],
    events: ['sports', 'club', 'cultural'],
    facility: ['maintenance', 'cafeteria', 'transport']
  };

  useEffect(() => {
    setLoading(true);
  
    const notificationsQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const repliesQuery = query(collection(db, 'support_replies'), orderBy('createdAt', 'desc'));
  
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      setNotifications(notificationsData);
  
      const unreadCount = notificationsData.filter(notification => !notification.read).length;
      setUnreadCount(unreadCount);
  
      navigation.setOptions({
        tabBarBadge: unreadCount > 0 ? unreadCount : null,
        tabBarBadgeStyle: { backgroundColor: '#EF4444' },
      });
    }, (error) => console.error('Error listening to notifications:', error));
  
    const unsubscribeReplies = onSnapshot(repliesQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const repliesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SupportMessage));
      setSupportReplies(repliesData);
    }, (error) => console.error('Error listening to support replies:', error));
  
    setLoading(false);
  
    return () => {
      unsubscribeNotifications();
      unsubscribeReplies();
    };
  }, [navigation]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSupportMessage = async (notification: Notification) => {
    if (!notification || !notification.supportMessageId) return;
    
    try {
      const messageRef = doc(db, 'support_replies', notification.supportMessageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data() as SupportMessage;
        setSelectedNotification({
          ...notification,
          supportMessage: messageData,
          supportReply: messageData.reply || null
        });
        setModalVisible(true);
      } else {
        Alert.alert('Error', 'Support message not found');
      }
    } catch (error) {
      console.error('Error fetching support message:', error);
      Alert.alert('Error', 'Could not load support message details');
    }
  };

  const loadNotifications = async () => {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const notificationsData: Notification[] = [];
      querySnapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Invalid timestamp format:', error);
      return 'Invalid date';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification) return;
    setSelectedNotification(notification);
    setModalVisible(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      notifications.forEach((notification) => {
        if (!notification.read) {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, { read: true });
        }
      });
      await batch.commit();
      setShowOptions(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      notifications.forEach((notification) => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      await batch.commit();
      setNotifications([]);
      setShowOptions(false);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notification: Notification) => {
    if (!notification) return;
    setDeletedNotification(notification);
    setShowUndoDelete(true);
    setNotifications(notifications.filter(n => n.id !== notification.id));
    
    setTimeout(async () => {
      if (deletedNotification?.id === notification.id) {
        await confirmDelete(notification.id);
        setShowUndoDelete(false);
        setDeletedNotification(null);
      }
    }, 3000);
  };

  const confirmDelete = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      if (deletedNotification) {
        setNotifications(prev => [...prev, deletedNotification]);
      }
    }
  };

  const undoDelete = () => {
    if (deletedNotification) {
      setNotifications(prev => [...prev, deletedNotification]);
      setDeletedNotification(null);
      setShowUndoDelete(false);
    }
  };

  const getNotificationIcon = (type: string = 'general', category: string | undefined = undefined): string => {
    if (category) {
      switch (category) {
        case 'book': return 'menu-book';
        case 'test': return 'quiz';
        case 'homework': return 'edit-note';
        case 'exam': return 'fact-check';
        case 'schedule': return 'event-note';
        default: return 'notifications';
      }
    }

    switch (type) {
      case 'test': return 'assignment';
      case 'book': return 'auto-stories';
      case 'update': return 'system-update';
      case 'alert': return 'warning';
      case 'maintenance': return 'build';
      case 'promotion': return 'local-offer';
      case 'event': return 'event';
      case 'reminder': return 'alarm';
      case 'announcement': return 'campaign';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (priority: string = 'normal', type: string = 'general', category: string | undefined = undefined): string => {
    if (category) {
      switch (category) {
        case 'book': return '#0EA5E9';
        case 'test': return '#8B5CF6';
        case 'homework': return '#10B981';
        case 'exam': return '#EC4899';
        case 'schedule': return '#F59E0B';
        default: return '#6366F1';
      }
    }

    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'normal': return '#3B82F6';
      case 'low': return '#22C55E';
      default:
        switch (type) {
          case 'test': return '#A855F7';
          case 'book': return '#06B6D4';
          case 'update': return '#6366F1';
          case 'alert': return '#F43F5E';
          default: return '#3B82F6';
        }
    }
  };

  const getBackgroundColor = (type: string = 'general', category: string | undefined = undefined): string => {
    if (category) {
      switch (category) {
        case 'book': return '#E0F2FE';
        case 'test': return '#F3E8FF';
        case 'homework': return '#ECFDF5';
        case 'exam': return '#FCE7F3';
        case 'schedule': return '#FEF3C7';
        default: return '#E0E7FF';
      }
    }

    switch (type) {
      case 'test': return '#F3E8FF';
      case 'book': return '#CFFAFE';
      case 'update': return '#E0E7FF';
      case 'alert': return '#FEE2E2';
      default: return '#DBEAFE';
    }
  };

  const formatNotificationType = (type: string = 'general'): string => {
    const types: Record<string, string> = {
      general: 'General',
      update: 'Update',
      alert: 'Alert',
      announcement: 'Announcement'
    };
    return types[type] || 'General';
  };

  const formatPriorityLevel = (priority: string = 'normal'): string | null => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'High';
      case 'low': return 'Low';
      default: return null;
    }
  };

  const getNotificationLabel = (type: string, category: string | undefined): string | null => {
    if (category) {
      switch (category) {
        case 'book': return 'Book Announcement';
        case 'test': return 'Test Announcement';
        case 'homework': return 'Homework Announcement';
        case 'exam': return 'Exam Announcement';
        case 'schedule': return 'Schedule Update';
        default: return null;
      }
    }

    switch (type) {
      case 'test': return 'Test';
      case 'book': return 'Book';
      case 'update': return 'Update';
      case 'alert': return 'Alert';
      default: return null;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notification: Notification) => {
        if (debouncedSearchQuery) {
          const query = debouncedSearchQuery.toLowerCase();
          const matchesSearch = 
            notification.title?.toLowerCase().includes(query) ||
            notification.message?.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        if (filters.type && notification.type !== filters.type) return false;
        if (filters.priority && notification.priority !== filters.priority) return false;
        if (filters.category && notification.category !== filters.category) return false;
        if (filters.read !== null && notification.read !== filters.read) return false;

        return true;
      })
      .sort((a: Notification, b: Notification) => {
        switch (sortBy) {
          case 'priority':
            const priorityOrder = { urgent: 3, high: 2, normal: 1, low: 0 };
            const diff = (priorityOrder[b.priority || 'normal'] || 0) - (priorityOrder[a.priority || 'normal'] || 0);
            return sortOrder === 'desc' ? diff : -diff;
          case 'type':
            return sortOrder === 'desc' 
              ? (b.type || '').localeCompare(a.type || '')
              : (a.type || '').localeCompare(b.type || '');
          case 'date':
          default:
            const dateA = a.createdAt?.toDate() || new Date(0);
            const dateB = b.createdAt?.toDate() || new Date(0);
            return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
        }
      });
  }, [notifications, debouncedSearchQuery, filters, sortBy, sortOrder]);

  const handleSearch = () => {
    setShowSearch(true);
    setShowFilter(false);
    setShowOptions(false);
  };

  const handleFilter = () => {
    setShowFilter(true);
    setShowSearch(false);
    setShowOptions(false);
  };

  const handleSort = (newSortBy: 'date' | 'priority' | 'type') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setShowOptions(false);
  };

  const groupNotifications = (notifications: Notification[]): Record<string, Notification[]> => {
    return notifications.reduce((groups, notification) => {
      let date = 'Unknown Date';
      try {
        if (notification.createdAt) {
          date = new Date(notification.createdAt.toDate()).toDateString();
        }
      } catch (error) {
        console.warn('Error formatting notification date:', error);
      }
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    }, {} as Record<string, Notification[]>);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ThreeDotsLoader color="#FF5733" size={12} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <>
          <View style={styles.optionsHeader}>
            {showSearch ? (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Text style={styles.searchCount}>
                    {filteredNotifications.length} found
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.leftActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, showSearch && styles.actionButtonActive]}
                    onPress={handleSearch}
                  >
                    <MaterialIcons 
                      name="search" 
                      size={24} 
                      color={showSearch ? "#FFFFFF" : "#2563EB"}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.rightActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, showFilter && styles.actionButtonActive]}
                    onPress={handleFilter}
                  >
                    <MaterialIcons 
                      name="sort" 
                      size={24} 
                      color={showFilter ? "#FFFFFF" : "#2563EB"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, showOptions && styles.actionButtonActive]}
                    onPress={() => setShowOptions(!showOptions)}
                  >
                    <MaterialIcons 
                      name="more-vert" 
                      size={24} 
                      color={showOptions ? "#FFFFFF" : "#2563EB"}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {showFilter && (
            <>
              <TouchableOpacity
                style={styles.overlay}
                onPress={() => setShowFilter(false)}
              />
              <View style={styles.filterMenu}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('date')}
                >
                  <MaterialIcons 
                    name={sortBy === 'date' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'schedule'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Date</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('priority')}
                >
                  <MaterialIcons 
                    name={sortBy === 'priority' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'priority-high'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Priority</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('type')}
                >
                  <MaterialIcons 
                    name={sortBy === 'type' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'sort'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Type</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {showOptions && (
            <>
              <TouchableOpacity
                style={styles.overlay}
                onPress={() => setShowOptions(false)}
              />
              <View style={styles.optionsMenu}>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={markAllAsRead}
                >
                  <MaterialIcons name="check" size={20} color="#2196F3" />
                  <Text style={styles.optionText}>Mark all as read</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={deleteAllNotifications}
                >
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                  <Text style={styles.optionText}>Delete all</Text>
                </TouchableOpacity>

                <View style={styles.optionsDivider} />
                
                <Text style={styles.optionsHeaderText}>Sort by</Text>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('date')}
                >
                  <MaterialIcons 
                    name={sortBy === 'date' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'schedule'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Date</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('priority')}
                >
                  <MaterialIcons 
                    name={sortBy === 'priority' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'priority-high'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Priority</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSort('type')}
                >
                  <MaterialIcons 
                    name={sortBy === 'type' ? (sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward') : 'sort'} 
                    size={20} 
                    color="#2196F3" 
                  />
                  <Text style={styles.optionText}>Type</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      <ScrollView 
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {filteredNotifications.length > 0 ? (
          Object.entries(groupNotifications(filteredNotifications)).map(([date, notifications]) => (
            <View key={date}>
              <Text style={styles.dateHeader}>{date}</Text>
              {notifications.map(notification => (
                notification && notification.id ? (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationCard,
                      !notification.read && styles.unreadCard,
                      { backgroundColor: getBackgroundColor(notification.type, notification.category) },
                      { borderLeftColor: getNotificationColor(notification.priority, notification.type, notification.category) }
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                  >
                    <View style={[
                      styles.notificationIcon,
                      { 
                        backgroundColor: `${getNotificationColor(notification.priority, notification.type, notification.category)}15`,
                        borderColor: getNotificationColor(notification.priority, notification.type, notification.category)
                      }
                    ]}>
                      <MaterialIcons 
                        name={getNotificationIcon(notification.type, notification.category) as keyof typeof MaterialIcons.glyphMap}
                        size={24} 
                        color={getNotificationColor(notification.priority, notification.type, notification.category)}
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationTitle,
                          { color: getNotificationColor(notification.priority, notification.type, notification.category) }
                        ]}>
                          {notification.title || 'Notification'}
                        </Text>
                        {notification.priority === 'urgent' && (
                          <View style={[styles.urgentBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Text style={[styles.urgentText, { color: '#DC2626' }]}>URGENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message || 'No message content'}
                      </Text>
                      <View style={styles.notificationFooter}>
                        <Text style={styles.notificationDate}>
                          {notification.createdAt ? formatDate(notification.createdAt) : 'No date'}
                        </Text>
                        <View style={styles.notificationTags}>
                          {getNotificationLabel(notification.type || 'general', notification.category) && (
                            <Text style={[
                              styles.typeTag,
                              { 
                                backgroundColor: `${getNotificationColor(notification.priority, notification.type, notification.category)}15`,
                                color: getNotificationColor(notification.priority, notification.type, notification.category)
                              }
                            ]}>
                              {getNotificationLabel(notification.type || 'general', notification.category)}
                            </Text>
                          )}
                          {formatPriorityLevel(notification.priority) && (
                            <Text style={[
                              styles.priorityTag,
                              { 
                                backgroundColor: `${getNotificationColor(notification.priority)}15`,
                                color: getNotificationColor(notification.priority)
                              }
                            ]}>
                              {formatPriorityLevel(notification.priority)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    {!notification.read && (
                      <View style={[
                        styles.unreadDot,
                        { backgroundColor: getNotificationColor(notification.priority, notification.type, notification.category) }
                      ]} />
                    )}
                  </TouchableOpacity>
                ) : null
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={48} color="#2563EB" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No matching notifications found' : 'No notifications yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalContent,
            { backgroundColor: getBackgroundColor(selectedNotification?.type, selectedNotification?.category) }
          ]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons 
                name="close" 
                size={24} 
                color={getNotificationColor(selectedNotification?.priority, selectedNotification?.type, selectedNotification?.category)} 
              />
            </TouchableOpacity>
            
            {selectedNotification && (
              <>
                <View style={[
                  styles.modalIcon,
                  { 
                    backgroundColor: `${getNotificationColor(selectedNotification.priority, selectedNotification.type, selectedNotification.category)}15`,
                    borderColor: getNotificationColor(selectedNotification.priority, selectedNotification.type, selectedNotification.category)
                  }
                ]}>
                  <MaterialIcons 
                    name={getNotificationIcon(selectedNotification.type, selectedNotification.category) as keyof typeof MaterialIcons.glyphMap}
                    size={32} 
                    color={getNotificationColor(selectedNotification.priority, selectedNotification.type, selectedNotification.category)}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {selectedNotification.title || 'Notification'}
                </Text>
                {selectedNotification.priority === 'urgent' && (
                  <View style={styles.modalUrgentBadge}>
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
                <Text style={styles.modalMessage}>
                  {selectedNotification.message || 'No message content'}
                </Text>
                <View style={styles.modalTags}>
                  {getNotificationLabel(selectedNotification.type || 'general', selectedNotification.category) && (
                    <Text style={[
                      styles.typeTag,
                      { 
                        backgroundColor: `${getNotificationColor(selectedNotification.priority, selectedNotification.type, selectedNotification.category)}15`,
                        color: getNotificationColor(selectedNotification.priority, selectedNotification.type, selectedNotification.category)
                      }
                    ]}>
                      {getNotificationLabel(selectedNotification.type || 'general', selectedNotification.category)}
                    </Text>
                  )}
                  {formatPriorityLevel(selectedNotification.priority) && (
                    <Text style={[
                      styles.priorityTag,
                      { 
                        backgroundColor: `${getNotificationColor(selectedNotification.priority)}15`,
                        color: getNotificationColor(selectedNotification.priority)
                      }
                    ]}>
                      {formatPriorityLevel(selectedNotification.priority)}
                    </Text>
                  )}
                </View>
                <Text style={styles.modalDate}>
                  {formatDate(selectedNotification.createdAt)}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {showUndoDelete && deletedNotification && (
        <View style={styles.undoContainer}>
          <Text style={styles.undoText}>Notification deleted</Text>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={undoDelete}
          >
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 1,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 6,
    marginBottom: 10,
    padding: 8,
    paddingBottom: 12,
    borderLeftWidth: 3,
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: '#E3F2FD',
  },
  notificationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 2,
    borderWidth: 2,
    alignSelf: 'center',
  },
  notificationContent: {
    flex: 1,
    paddingRight: 4,
    justifyContent: 'center',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    color: '#1F2937',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  notificationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 6,
    right: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 300,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalDate: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  optionsMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 3,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  undoContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#323232',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  undoText: {
    color: '#FFFFFF',
    marginRight: 16,
    fontSize: 14,
  },
  undoButton: {
    padding: 4,
  },
  undoButtonText: {
    color: '#2196F3',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalUrgentBadge: {
    backgroundColor: '#f4433615',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginVertical: 4,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 8,
    marginRight: 4,
  },
  filterMenu: {
    position: 'absolute',
    top: 50,
    right: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 3,
  },
  searchCount: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  optionsHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionButtonActive: {
    backgroundColor: '#2563EB',
  },
  optionsDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
});

export default function Notification() {
  return (
    <View style={{ flex: 1 }}>
      <NotificationScreen />
    </View>
  );
}