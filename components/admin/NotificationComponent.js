import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Dimensions } from 'react-native';


const NotificationComponent = () => {
  const router = useRouter();
  
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'general', // Updated types
    priority: 'normal', // Updated priority levels
    targetAudience: 'all', // Updated target audiences
    specificEmails: '',
  });

  const [users, setUsers] = useState([]); // To store user list for reference

  // Add new state for chart data
  const [chartData, setChartData] = useState({
    types: {},
    priorities: {},
    audiences: {}
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchNotifications = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'notifications'));
      const notificationsData = [];
      querySnapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notificationsData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      Alert.alert('Error', 'Please fill in both title and message');
      return;
    }

    // Validate email addresses if specific audience is selected
    if (newNotification.targetAudience === 'specific' && !newNotification.specificEmails.trim()) {
      Alert.alert('Error', 'Please enter at least one email address');
      return;
    }

    try {
      let targetUsers = [];

      // Determine target users based on audience selection
      switch (newNotification.targetAudience) {
        case 'paid':
          targetUsers = users.filter(user => user.isPaid).map(user => user.email);
          break;
        case 'unpaid':
          targetUsers = users.filter(user => !user.isPaid).map(user => user.email);
          break;
        case 'specific':
          targetUsers = newNotification.specificEmails
            .split(',')
            .map(email => email.trim())
            .filter(email => email !== '');
          break;
        case 'all':
        default:
          targetUsers = users.map(user => user.email);
          break;
      }

      await addDoc(collection(db, 'notifications'), {
        ...newNotification,
        targetUsers,
        createdAt: serverTimestamp(),
        status: 'active'
      });

      setNewNotification({
        title: '',
        message: '',
        type: 'general',
        priority: 'normal',
        targetAudience: 'all',
        specificEmails: '',
      });
      
      fetchNotifications();
      Alert.alert('Success', 'Notification created successfully');
    } catch (error) {
      console.error('Error creating notification:', error);
      Alert.alert('Error', 'Failed to create notification');
    }
  };

  const handleDeleteNotification = (notificationId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'notifications', notificationId));
              fetchNotifications();
              Alert.alert('Success', 'Notification deleted successfully');
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      const matchesType = filterType === 'all' || notification.type === filterType;
      const matchesPriority = filterPriority === 'all' || notification.priority === filterPriority;
      const matchesAudience = filterAudience === 'all' || notification.targetAudience === filterAudience;
      return matchesType && matchesPriority && matchesAudience;
    });
  };

  // Function to calculate chart data
  const calculateChartData = (notifications) => {
    const types = {};
    const priorities = {};
    const audiences = {};

    notifications.forEach(notification => {
      // Count by type
      types[notification.type] = (types[notification.type] || 0) + 1;
      
      // Count by priority
      priorities[notification.priority] = (priorities[notification.priority] || 0) + 1;
      
      // Count by audience
      audiences[notification.targetAudience] = (audiences[notification.targetAudience] || 0) + 1;
    });

    setChartData({ types, priorities, audiences });
  };

  // Update useEffect to calculate chart data when notifications change
  useEffect(() => {
    calculateChartData(notifications);
  }, [notifications]);

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const chartColors = [
    '#2196F3', // blue
    '#4CAF50', // green
    '#FFC107', // amber
    '#F44336', // red
    '#9C27B0', // purple
    '#FF9800', // orange
    '#795548', // brown
    '#607D8B', // blue-grey
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Create New Notification</Text>
          
          {/* Type Selection */}
          <Text style={styles.label}>Notification Type</Text>
          <View style={styles.typeContainer}>
            {[
              'general',
              'update',
              'alert',
              'maintenance',
              'promotion',
              'event',
              'reminder',
              'announcement'
            ].map((type) => (
              <TouchableOpacity 
                key={type}
                style={[
                  styles.typeButton,
                  newNotification.type === type && styles.selectedType
                ]}
                onPress={() => setNewNotification(prev => ({ ...prev, type }))}
              >
                <Text style={[
                  styles.typeText,
                  newNotification.type === type && styles.selectedTypeText
                ]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority Level Selection */}
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.typeContainer}>
            {['low', 'normal', 'high', 'urgent'].map((priority) => (
              <TouchableOpacity 
                key={priority}
                style={[
                  styles.typeButton,
                  newNotification.priority === priority && styles.selectedType,
                  styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`]
                ]}
                onPress={() => setNewNotification(prev => ({ ...prev, priority }))}
              >
                <Text style={[
                  styles.typeText,
                  newNotification.priority === priority && styles.selectedTypeText
                ]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Target Audience Selection */}
          <Text style={styles.label}>Target Audience</Text>
          <View style={styles.audienceContainer}>
            {[
              { id: 'all', label: 'All Users' },
              { id: 'paid', label: 'Paid Users' },
              { id: 'unpaid', label: 'Unpaid Users' },
              { id: 'new', label: 'New Users' },
              { id: 'active', label: 'Active Users' },
              { id: 'inactive', label: 'Inactive Users' },
              { id: 'premium', label: 'Premium Users' },
              { id: 'specific', label: 'Specific Users' }
            ].map((audience) => (
              <TouchableOpacity 
                key={audience.id}
                style={[
                  styles.audienceButton,
                  newNotification.targetAudience === audience.id && styles.selectedAudience
                ]}
                onPress={() => setNewNotification(prev => ({ 
                  ...prev, 
                  targetAudience: audience.id,
                  specificEmails: audience.id === 'specific' ? prev.specificEmails : '' 
                }))}
              >
                <Text style={[
                  styles.audienceText,
                  newNotification.targetAudience === audience.id && styles.selectedAudienceText
                ]}>{audience.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Specific Emails Input */}
          {newNotification.targetAudience === 'specific' && (
            <View style={styles.specificEmailsContainer}>
              <Text style={styles.specificEmailsLabel}>Enter email addresses (comma-separated)</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="e.g., user1@example.com, user2@example.com"
                value={newNotification.specificEmails}
                onChangeText={(text) => setNewNotification(prev => ({ 
                  ...prev, 
                  specificEmails: text 
                }))}
                multiline
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.emailHelpText}>
                You can enter multiple email addresses separated by commas
              </Text>
            </View>
          )}

          {/* Existing inputs */}
          <TextInput
            style={styles.input}
            placeholder="Notification Title"
            value={newNotification.title}
            onChangeText={(text) => setNewNotification(prev => ({ ...prev, title: text }))}
          />

          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Notification Message"
            value={newNotification.message}
            onChangeText={(text) => setNewNotification(prev => ({ ...prev, message: text }))}
            multiline
          />

          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateNotification}
          >
            <Text style={styles.buttonText}>Send Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Display notifications with type indicators */}
        <View style={styles.listCard}>
          <Text style={styles.cardTitle}>Recent Notifications</Text>
          
          {/* Filter Controls */}
          <View style={styles.filterContainer}>
            {/* Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type Filter:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                <TouchableOpacity 
                  style={[styles.filterButton, filterType === 'all' && styles.selectedFilter]}
                  onPress={() => setFilterType('all')}
                >
                  <Text style={[styles.filterText, filterType === 'all' && styles.selectedFilterText]}>All</Text>
                </TouchableOpacity>
                {[
                  'general',
                  'update',
                  'alert',
                  'maintenance',
                  'promotion',
                  'event',
                  'reminder',
                  'announcement'
                ].map((type) => (
                  <TouchableOpacity 
                    key={type}
                    style={[styles.filterButton, filterType === type && styles.selectedFilter]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.filterText, filterType === type && styles.selectedFilterText]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Priority Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Priority Filter:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                <TouchableOpacity 
                  style={[styles.filterButton, filterPriority === 'all' && styles.selectedFilter]}
                  onPress={() => setFilterPriority('all')}
                >
                  <Text style={[styles.filterText, filterPriority === 'all' && styles.selectedFilterText]}>All</Text>
                </TouchableOpacity>
                {['low', 'normal', 'high', 'urgent'].map((priority) => (
                  <TouchableOpacity 
                    key={priority}
                    style={[
                      styles.filterButton, 
                      filterPriority === priority && styles.selectedFilter,
                      styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}Filter`]
                    ]}
                    onPress={() => setFilterPriority(priority)}
                  >
                    <Text style={[styles.filterText, filterPriority === priority && styles.selectedFilterText]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Audience Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Audience Filter:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                <TouchableOpacity 
                  style={[styles.filterButton, filterAudience === 'all' && styles.selectedFilter]}
                  onPress={() => setFilterAudience('all')}
                >
                  <Text style={[styles.filterText, filterAudience === 'all' && styles.selectedFilterText]}>All</Text>
                </TouchableOpacity>
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'paid', label: 'Paid Users' },
                  { id: 'unpaid', label: 'Unpaid Users' },
                  { id: 'new', label: 'New Users' },
                  { id: 'active', label: 'Active Users' },
                  { id: 'inactive', label: 'Inactive Users' },
                  { id: 'premium', label: 'Premium Users' },
                  { id: 'specific', label: 'Specific Users' }
                ].map((audience) => (
                  <TouchableOpacity 
                    key={audience.id}
                    style={[styles.filterButton, filterAudience === audience.id && styles.selectedFilter]}
                    onPress={() => setFilterAudience(audience.id)}
                  >
                    <Text style={[styles.filterText, filterAudience === audience.id && styles.selectedFilterText]}>
                      {audience.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Update notifications mapping to use filtered results */}
          {getFilteredNotifications().map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={styles.notificationHeader}>
                <View style={styles.titleContainer}>
                  <View style={[
                    styles.typeIndicator,
                    styles[`${notification.type}Indicator`]
                  ]} />
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteNotification(notification.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>
              {(notification.createdAt && typeof notification.createdAt.toDate === 'function') 
  ? notification.createdAt.toDate().toLocaleString() 
  : 'Just now'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    marginBottom: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ff5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    width: '23%', // 4 buttons per row
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedType: {
    backgroundColor: '#2196F3',
  },
  typeText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 12,
  },
  selectedTypeText: {
    color: '#fff',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  generalIndicator: {
    backgroundColor: '#2196F3',
  },
  updateIndicator: {
    backgroundColor: '#4CAF50',
  },
  alertIndicator: {
    backgroundColor: '#f44336',
  },
  audienceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  audienceButton: {
    width: '48%', // 2 buttons per row
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedAudience: {
    backgroundColor: '#2196F3',
  },
  audienceText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  selectedAudienceText: {
    color: '#fff',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  selectedFilter: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFilterText: {
    color: '#fff',
  },
  // Priority filter specific styles
  priorityLowFilter: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  priorityNormalFilter: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  priorityHighFilter: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  priorityUrgentFilter: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chartLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  specificEmailsContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  specificEmailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emailHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Add missing priority styles referenced in the component
  priorityLow: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  priorityNormal: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  priorityHigh: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  priorityUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  // Add missing type indicator styles
  maintenanceIndicator: {
    backgroundColor: '#FF9800', // orange
  },
  promotionIndicator: {
    backgroundColor: '#9C27B0', // purple
  },
  eventIndicator: {
    backgroundColor: '#795548', // brown
  },
  reminderIndicator: {
    backgroundColor: '#607D8B', // blue-grey
  },
  announcementIndicator: {
    backgroundColor: '#FF5722', // deep orange
  }
});

export default NotificationComponent;