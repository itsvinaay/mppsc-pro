import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useUserRole } from '../../utils/useUserRole';
import  ThreeDotsLoader  from '../../components/ThreeDotsLoader';
export const AdminRoute = ({ children }) => {
  const { userRole, loading } = useUserRole();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
       

        <ThreeDotsLoader size={20} color="#2196F3" />

      </View>
    );
  }

  if (userRole !== 'admin') {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  return children;
};
