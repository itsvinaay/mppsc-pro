import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import UserDetailComponent from '../../../components/admin/UserManagement/UserDetails';

const UserDetailScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <UserDetailComponent />
    </View>
  );
};

export default function ProtectedUserDetail() {
  return (
    <AdminRoute>
      <UserDetailScreen />
    </AdminRoute>
  );
}