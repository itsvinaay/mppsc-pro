import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/styles';

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'notification';
  read: boolean;
  createdAt: {
    toDate: () => Date;
  };
  onPress: (id: string) => void;
}

export function NotificationItem({ 
  id, 
  title, 
  message, 
  type, 
  read, 
  createdAt, 
  onPress 
}: NotificationItemProps) {
  return (
    <TouchableOpacity 
      style={[styles.notificationItem, !read && styles.unreadItem]}
      onPress={() => onPress(id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={type === 'alert' ? 'alert-circle' : 'notifications'} 
          size={24} 
          color={colors.primary} 
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.time}>
          {new Date(createdAt?.toDate()).toLocaleDateString()}
        </Text>
      </View>
      {!read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  unreadItem: {
    backgroundColor: '#f8f8f8',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignSelf: 'center',
  },
});