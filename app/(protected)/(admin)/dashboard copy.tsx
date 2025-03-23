import { View, Text } from 'react-native';
import ScreenLayout from '../../../components/layout/ScreenLayout';
import { commonStyles, colors } from '../../../constants/styles';
import { appText } from '../../../constants/text';

export default function Dashboard() {
  return (
    <ScreenLayout 
      title={appText.menuItems.dashboard}
      rightIcon={{
        name: "refresh",
        onPress: () => console.log('Refresh dashboard')
      }}
    >
      <View style={commonStyles.card}>
        <Text style={commonStyles.sectionTitle}>Your Progress</Text>
        <Text style={commonStyles.subtitle}>Track your preparation journey</Text>
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.sectionTitle}>Recent Tests</Text>
        <Text style={commonStyles.subtitle}>View your recent test performances</Text>
      </View>

      <View style={commonStyles.card}>
        <Text style={commonStyles.sectionTitle}>Study Time</Text>
        <Text style={commonStyles.subtitle}>Monitor your study hours</Text>
      </View>
    </ScreenLayout>
  );
}