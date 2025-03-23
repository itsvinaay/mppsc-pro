import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import UploadBookComponent from '../../../components/admin/UploadBookComponent';

const UploadBookScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <UploadBookComponent />
    </View>
  );
};

export default function ProtectedUploadBook() {
  return (
    <AdminRoute>
      <UploadBookScreen />
    </AdminRoute>
  );
}