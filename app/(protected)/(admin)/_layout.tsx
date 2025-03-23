import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { auth } from '../../../config/firebase';

const ADMIN_EMAILS = ['admin@example.com', 'admin1@gmail.com']; // Add your admin emails here

export default function AdminLayout() {
  useEffect(() => {
    const checkAdminAccess = async () => {
      const user = auth.currentUser;
      const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
      
      if (!isAdmin) {
        router.replace('/(protected)/(admin)/dashboard');
        return null;
      }
    };

    checkAdminAccess();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}