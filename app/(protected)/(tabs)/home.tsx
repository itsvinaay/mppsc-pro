import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { auth } from '../../../config/firebase';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
// Update these import lines
import { commonStyles, colors } from '../../../constants/styles';
import { appText } from '../../../constants/text';
import BannerHome from '../../../components/home/bannerHome';
import Categories from '../../../components/home/Categories';

export default function Home() {
  useEffect(() => {
    console.log('Home screen mounted');
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  type RouteNames = 
    | '/(protected)/(tabs)/home'
    | '/(protected)/(tabs)/courses'
    | '/(protected)/(tabs)/profile'
    | '/(protected)/(tabs)/notifications';

  const navigateTo = (screen: RouteNames) => {
    router.push('/(protected)/(tabs)/home');
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: 'grid',
      route: '/(profile)/leaderboard',
      bgColor: '#E8F0FE',
      iconColor: '#007AFF'
    },
    {
      name: 'Courses',
      icon: 'book',
      route: '/(profile)/tests',
      bgColor: '#E6F9ED',
      iconColor: '#34C759'
    },
    {
      name: 'Profile',
      icon: 'person',
      route: '/(protected)/(tabs)/profile',
      bgColor: '#F2E8FF',
      iconColor: '#AF52DE'
    },
    {
      name: 'Notifications',
      icon: 'notifications',
      route: '/(protected)/(tabs)/notifications',
      bgColor: '#FFE8E8',
      iconColor: '#FF3B30'
    }
  ];

  const testOptions = [
    {
      id: '1',
      title: 'Free Tests',
      subtitle: 'Practice with sample questions',
      icon: 'document-text-outline',
      backgroundColor: '#4F46E5',
      route: '/(protected)/(screen)/free-tests',
    },
    {
      id: '2',
      title: 'Test Series',
      subtitle: 'Complete mock tests',
      icon: 'school-outline',
      backgroundColor: '#EC4899',
      route: '/(protected)/(screen)/test-series',
    },
  ];

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.header}>
        <Text style={commonStyles.headerTitle}>MPPSC Pro</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Hello {auth.currentUser?.displayName || 'User'}!
          </Text>
          <Text style={commonStyles.subtitle}>Welcome to MPPSC Pro! Start your preparation journey.</Text>
        </View>
        
        <BannerHome />
        
        {/* Add Test Options section */}
        <View style={styles.testOptionsContainer}>
          {testOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.testOptionCard, { backgroundColor: option.backgroundColor }]}
              onPress={() => router.push(option.route as any)}
            >
              <Ionicons name={option.icon as keyof typeof Ionicons.glyphMap} size={24} color="#fff" />
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.route}
              style={styles.menuItem} 
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                <Ionicons 
                  name={item.icon as any} 
                  size={28} 
                  color={item.iconColor} 
                />
              </View>
              <Text style={styles.menuText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

          <Categories />
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityItem}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.activityText}>Completed Daily Quiz</Text>
            <Text style={styles.activityTime}>2h ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="book-outline" size={20} color="#666" />
            <Text style={styles.activityText}>Started Indian History course</Text>
            <Text style={styles.activityTime}>Yesterday</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Add these new styles to your StyleSheet
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
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitleText: {
    fontSize: 16,
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
  },
  menuText: {
    fontSize: 14,
    textAlign: 'center',
  },
  recentActivity: {
    padding: 20,
    marginTop: 10,
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
  activityText: {
    marginLeft: 10,
    flex: 1,
  },
  activityTime: {
    color: '#999',
    fontSize: 12,
  },
  testOptionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  testOptionCard: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'flex-end',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  optionSubtitle: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
});