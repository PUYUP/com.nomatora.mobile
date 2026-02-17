import { Stack } from 'expo-router';

export default function DialogLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="location-selector-map"
        options={{
          headerShown: true,
          title: 'Select Location',
        }}
      />
    </Stack>
  );
}
