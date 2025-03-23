import { Stack } from 'expo-router';
import { useSession } from '../../../context/SessionContext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/styles';
import { appText } from '../../../constants/text';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Set up real-time listener for unread notifications
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching notifications: ", error);
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#f0f0f0',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#999',
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: appText.menuItems.dashboard,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="books"
          options={{
            title: appText.menuItems.book,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book" size={size} color={color} />
            ),
          }}
        />
       
        <Tabs.Screen
          name="notification"
          options={{
            title: appText.menuItems.notifications,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications" size={size} color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        
        <Tabs.Screen
          name="profile"
          options={{
            title: appText.menuItems.profile,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}