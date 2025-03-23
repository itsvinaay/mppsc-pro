import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import BannerEditComponent from '../../../components/admin/BannerEditComponent';

const BannerEditScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <BannerEditComponent />
    </View>
  );
};

export default function ProtectedBannerEdit() {
  return (
    <AdminRoute>
      <BannerEditScreen />
    </AdminRoute>
  );
}