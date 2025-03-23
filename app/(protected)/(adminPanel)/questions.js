import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import QuestionFormComponent from '../../../components/admin/TestManagement/QuestionForm';

const QuestionScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <QuestionFormComponent />
    </View>
  );
};

export default function ProtectedQuestion() {
  return (
    <AdminRoute>
      <QuestionScreen />
    </AdminRoute>
  );
}