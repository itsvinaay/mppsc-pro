import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { commonStyles, colors } from '../../constants/styles';

interface ScreenLayoutProps {
  title: string;
  children: React.ReactNode;
  showBack?: boolean;
  rightIcon?: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
  };
}

export default function ScreenLayout({
  title,
  children,
  showBack = true,
  rightIcon
}: ScreenLayoutProps) {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.header}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={commonStyles.headerTitle}>{title}</Text>
        {rightIcon ? (
          <TouchableOpacity onPress={rightIcon.onPress}>
            <Ionicons 
              name={rightIcon.name} 
              size={24} 
              color={rightIcon.color || colors.primary} 
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>
      <ScrollView style={commonStyles.content}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}