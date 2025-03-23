import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import CreateNotificationComponent from '../../../components/admin/NotificationComponent';

const CreateNotificationScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <CreateNotificationComponent />
    </View>
  );
};

export default function ProtectedCreateNotification() {
  return (
    <AdminRoute>
      <CreateNotificationScreen />
    </AdminRoute>
  );
}