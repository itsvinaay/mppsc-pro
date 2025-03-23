import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import SupportMessagesComponent from '../../../components/admin/SupportComponent';

const SupportMessagesScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <SupportMessagesComponent />
    </View>
  );
};

export default function SupportMessages() {
  return (
    <AdminRoute>
      <SupportMessagesScreen />
    </AdminRoute>
  );
}