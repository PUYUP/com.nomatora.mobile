import HeaderBackButton from '@/components/partials/header-back-button';
import { Stack } from 'expo-router';

export default function DialogLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="location-selector-map" />
      <Stack.Screen
        name="currency-selector"
        options={{
          title: 'Choose Currency',
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
      <Stack.Screen
        name="item-editor"
        options={{
          title: 'Add Item',
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: 'ZalandoSansExpanded_900Black',
            color: '#1F3D2B',
          },
          headerLeft: (props) => {
            return <HeaderBackButton {...props} />;
          },
        }}
      />
      <Stack.Screen
        name="journey-stats"
        options={{
          title: 'Journey Stats',
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: 'ZalandoSansExpanded_900Black',
            color: '#1F3D2B',
          },
          headerLeft: (props) => {
            return <HeaderBackButton {...props} />;
          },
        }}
      />
    </Stack>
  );
}
