import HeaderBackButton from '@/components/partials/header-back-button';
import { Stack } from 'expo-router';

export default function DialogLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: true,
        contentStyle: { paddingTop: 110 },
        // header: (props) => {
        //   return (
        //     <Header
        //       {...props}
        //       headerLeftContainerStyle={{ paddingLeft: 16 }}
        //       headerRightContainerStyle={{ paddingRight: 16 }}
        //       headerStyle={[props.options.headerStyle, { height: 120 }]}
        //       headerTitleContainerStyle={{ paddingBottom: 116 }}
        //       headerTitleStyle={props.options.headerTitleStyle}
        //       title={typeof props.options.headerTitle === 'string' ? props.options.headerTitle : props.route.name}
        //       headerLeft={props.options.headerLeft}
        //       headerRight={props.options.headerRight}
        //     />
        //   );
        // },
      }}>
      <Stack.Screen
        name="location-selector-map"
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
      <Stack.Screen
        name="item-editor"
        options={{
          headerShown: true,
          title: 'Add Item',
          headerTransparent: false,
          headerShadowVisible: false,
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
