import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import UserListComponent from '../../../components/admin/UserManagement/UserList';

const UserListScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <UserListComponent />
    </View>
  );
};

export default function ProtectedUserList() {
  return (
    <AdminRoute>
      <UserListScreen />
    </AdminRoute>
  );
}