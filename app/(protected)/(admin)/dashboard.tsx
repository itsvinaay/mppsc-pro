import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AdminDashboard() {
  const adminMenuItems = [
    {
      id: 1,
      title: 'Users Management',
      icon: 'people',
      color: '#007AFF',
      route: '/(protected)/(admin)/users',
      count: '2.5K'
    },
    {
      id: 2,
      title: 'Course Management',
      icon: 'book',
      color: '#34C759',
      route: '/(protected)/(admin)/courses',
      count: '15'
    },
    {
      id: 3,
      title: 'Test Management',
      icon: 'document-text',
      color: '#FF9500',
      route: '/(protected)/(admin)/tests',
      count: '25'
    },
    {
      id: 4,
      title: 'Results & Analytics',
      icon: 'stats-chart',
      color: '#AF52DE',
      route: '/(protected)/(admin)/analytics',
      count: '1.2K'
    },
    {
      id: 5,
      title: 'Notifications',
      icon: 'notifications',
      color: '#FF3B30',
      route: '/(protected)/(admin)/notifications',
      count: '50'
    },
    {
      id: 6,
      title: 'Content Management',
      icon: 'library',
      color: '#5856D6',
      route: '/(protected)/(admin)/content',
      count: '100'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-circle" size={30} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2,500</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹25K</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {adminMenuItems.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={28} color={item.color} />
                {item.count && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentActivities}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activityItem}>
            <Ionicons name="person-add" size={20} color="#007AFF" />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>New user registered</Text>
              <Text style={styles.activityTime}>2 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="create" size={20} color="#34C759" />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Course content updated</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="trophy" size={20} color="#FF9500" />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>New test results published</Text>
              <Text style={styles.activityTime}>3 hours ago</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.supportButton}>
          <Ionicons name="headset" size={24} color="#fff" />
          <Text style={styles.supportButtonText}>Customer Support</Text>
        </TouchableOpacity>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  profileButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    margin: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  menuItem: {
    width: '33.33%',
    padding: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  recentActivities: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityContent: {
    marginLeft: 15,
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    margin: 20,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});