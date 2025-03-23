import { Stack, Redirect } from 'expo-router';
import { TouchableOpacity, View, Text, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserRole } from '../../../utils/useUserRole';

export default function AdminLayout() {
  const router = useRouter();
  const { userRole, loading } = useUserRole();

  if (loading) {
    return null;
  }

  if (userRole !== 'admin') {
    return <Redirect href="/(drawer)/(tabs)" />;
  }

  return (
    <>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#4169E1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            textAlign: 'center',
          },
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ 
                marginLeft: 10,
                padding: 8,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 8,
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          ),
        }}
      >
        <Stack.Screen 
          name="adminPanel" 
          options={{ 
            title: 'Admin Panel',
          }} 
        />
        <Stack.Screen 
          name="category" 
          options={{ 
            title: 'Manage Category',
          }} 
        />
        <Stack.Screen 
          name="tests" 
          options={{ 
            title: 'Tests',
          }} 
        />
        <Stack.Screen   
          name="questions" 
          options={{ 
            title: 'Questions',
          }} 
        />
         <Stack.Screen   
          name="MembershipManagement" 
          options={{ 
            title: 'Manage Plans',
          }} 
        />
        <Stack.Screen   
          name="leaderboard" 
          options={{ 
            title: 'Leaderboard',
          }} 
        />
        <Stack.Screen   
          name="bannerEdit" 
          options={{ 
            title: 'Banner Edit',
          }} 
        />
        <Stack.Screen   
          name="users" 
          options={{ 
            title: 'Users',
          }} 
        />
        <Stack.Screen   
          name="uploadBooks" 
          options={{ 
            title: 'Upload Books',
          }} 
        />
        <Stack.Screen   
          name="createNotification" 
          options={{ 
            title: 'Create Notification',
          }} 
        />
        <Stack.Screen   
          name="support" 
          options={{ 
            title: 'Support',
          }} 
        />
        <Stack.Screen   
          name="userDetail" 
          options={{ 
            title: 'User Detail',
          }} 
        />
        <Stack.Screen   
          name="supportMessages" 
          options={{ 
            title: 'Support Messages',
          }} 
        />
      </Stack>
    </>
  );
}

