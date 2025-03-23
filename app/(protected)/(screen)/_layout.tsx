import { Stack } from 'expo-router';

export default function ScreenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="test-series"
        options={{
          animation: 'none'
        }}
      />
      <Stack.Screen
        name="free-test"
        options={{
          animation: 'none'
        }}
      />
    </Stack>
  );
}