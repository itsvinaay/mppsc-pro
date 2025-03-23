import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserRole } from '../../../utils/useUserRole';
import { useEffect } from 'react';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import AdminPanelComponent from '../../../components/admin/AdminPanelComponent';

const AdminPanel = () => {
  const router = useRouter();
  const { userRole, loading } = useUserRole();

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can access this page');
      router.replace('/(tabs)');
    }
  }, [loading, userRole]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>  </Text>
      </View>
    );
  }

  if (userRole !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Access Denied. Admin only.</Text>
      </View>
    );
  }

  return <AdminPanelComponent />;
};

export default function ProtectedAdminPanel() {
  return (
    <AdminRoute>
      <AdminPanel />
    </AdminRoute>
  );
}