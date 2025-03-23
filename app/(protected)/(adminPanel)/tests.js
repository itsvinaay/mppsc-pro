import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import TestListComponent from '../../../components/admin/TestManagement/TestList';

const TestListScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <TestListComponent />
    </View>
  );
};

export default function ProtectedTestList() {
  return (
    <AdminRoute>
      <TestListScreen />
    </AdminRoute>
  );
}