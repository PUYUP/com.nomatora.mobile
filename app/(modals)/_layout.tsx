import HeaderBackButton from '@/components/partials/header-back-button';
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
      <Stack.Screen
        name="currency-selector"
        options={{
          headerShown: true,
          title: 'Choose Currency',
          headerTransparent: true,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: 'ZalandoSansExpanded_900Black',
            color: '#1F3D2B',
          },
          headerLeft: (props) => {
            return <HeaderBackButton {...props} />;
          }
        }}
      />
    </Stack>
  );
}
