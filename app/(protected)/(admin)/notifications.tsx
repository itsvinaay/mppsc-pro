import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';

export default function NotificationsManagement() {
  const [notifications] = useState([
    {
      id: '1',
      title: 'New Test Series Available',
      message: 'MPPSC Prelims 2024 test series is now available',
      type: 'announcement',
      sentTo: 'All Users',
      time: '2 hours ago',
      status: 'sent'
    },
    {
      id: '2',
      title: 'Maintenance Update',
      message: 'System will be under maintenance on Sunday',
      type: 'system',
      sentTo: 'All Users',
      time: '1 day ago',
      status: 'scheduled'
    },
    {
      id: '3',
      title: 'Premium Feature Update',
      message: 'New premium features added to the platform',
      type: 'premium',
      sentTo: 'Premium Users',
      time: '3 days ago',
      status: 'sent'
    }
  ]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'announcement': return 'megaphone';
      case 'system': return 'cog';
      case 'premium': return 'star';
      default: return 'notifications';
    }
  };

  const getStatusColor = (status) => {
    return status === 'sent' ? '#34C759' : '#FF9500';
  };

  const renderNotification = (item) => (
    <TouchableOpacity 
      key={item.id}
      style={styles.notificationCard}
      onPress={() => router.push(`/admin/notifications/${item.id}`)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name={getNotificationIcon(item.type)} size={24} color="#007AFF" />
          <View style={styles.titleContainer}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationType}>{item.type}</Text>
          </View>
        </View>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>

      <Text style={styles.message} numberOfLines={2}>{item.message}</Text>

      <View style={styles.notificationFooter}>
        <View style={styles.footerInfo}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.footerText}>{item.sentTo}</Text>
        </View>
        <View style={styles.footerInfo}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.footerText}>{item.time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
          <Text style={styles.activeFilterText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Sent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>Scheduled</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.notificationList}>
        {notifications.map(renderNotification)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  notificationList: {
    flex: 1,
    padding: 15,
  },
  notificationCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleContainer: {
    marginLeft: 15,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  notificationType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
});