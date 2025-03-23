import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../context/SessionContext';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(protected)/(tabs)/home');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );
}