import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const AdminPanelComponent = () => {
  const router = useRouter();

  const adminOptions = [
    {
      title: 'Categories',
      description: 'Manage quiz categories',
      route: '/(protected)/(adminPanel)/category',
      icon: 'folder-outline'
    },
    {
      title: 'Tests',
      description: 'Manage tests and questions',
      route: '/(protected)/(adminPanel)/tests',
      icon: 'document-text-outline'
    },
    {
      title: 'Questions',
      description: 'Manage questions',
      route: '/(protected)/(adminPanel)/questions',
      icon: 'help-circle-outline'
    },
    {
      title: 'Membership',
      description: 'Manage membership',
      route: '/(protected)/(adminPanel)/MembershipManagement',
      icon: 'star-outline'
    },
    {
      title: 'Leaderboard',
      description: 'View leaderboard',
      route: '/(protected)/(adminPanel)/leaderboard',
      icon: 'trophy-outline'
    },
    {
      title: 'uploadBooks',
      description: 'uploadBooks',
      route: '/(protected)/(adminPanel)/uploadBooks',
      icon: 'book-outline'
    },
    {
      title: 'createNotification',
      description: 'createNotification',
      route: '/(protected)/(adminPanel)/createNotification',
      icon: 'notifications-outline'
    },
    {
      title: 'bannerEdit',
      description: 'bannerEdit',
      route: '/(protected)/(adminPanel)/bannerEdit',
      icon: 'image-outline'
    },
    {
      title: 'Users',
      description: 'View user statistics',
      route: '/(protected)/(adminPanel)/users',
      icon: 'people-outline'
    },
    {
      title: 'support',
      description: 'View user statistics',
      route: '/(protected)/(adminPanel)/supportMessages',
      icon: 'chatbox-outline'
    }
  ];

  const getIconBackground = (index) => {
    const backgrounds = ['#FFE0E0', '#E0F4FF', '#E0FFE3', '#F4E0FF', '#FFF3E0'];
    return backgrounds[index % backgrounds.length];
  };

  const getIconColor = (index) => {
    const colors = ['#FF4444', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {adminOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(option.route)}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardDescription}>{option.description}</Text>
              </View>
              <View style={[styles.iconContainer, { backgroundColor: getIconBackground(index) }]}>
                <Ionicons name={option.icon} size={24} color={getIconColor(index)} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  card: {
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
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  iconContainer: {
    padding: 10,
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminPanelComponent;