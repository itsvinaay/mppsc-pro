import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../context/SessionContext';
import { ActivityIndicator, View } from 'react-native';

export default function ProtectedLayout() {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Stack />;
}