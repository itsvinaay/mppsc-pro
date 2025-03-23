import { View } from 'react-native';
import { AdminRoute } from '../../../components/admin/AdminRoute';
import LeaderboardComponent from '../../../components/admin/LeaderboardComponent';

const LeaderboardScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <LeaderboardComponent />
    </View>
  );
};

export default function ProtectedLeaderboard() {
  return (
    <AdminRoute>
      <LeaderboardScreen />
    </AdminRoute>
  );
}