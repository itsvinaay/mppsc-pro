import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import CategoryComponent from '../../../components/admin/CategoryComponent';

const CategoryScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <CategoryComponent />
    </View>
  );
};

export default function ProtectedCategory() {
  return (
    <AdminRoute>
      <CategoryScreen />
    </AdminRoute>
  );
}