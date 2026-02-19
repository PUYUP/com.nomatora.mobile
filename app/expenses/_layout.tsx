import HeaderBackButton from "@/components/partials/header-back-button";
import { Header } from '@react-navigation/elements';
import { Stack } from "expo-router";

export default function ExpensesLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: true, 
      headerTitleStyle: { fontFamily: 'ZalandoSansExpanded_900Black', fontSize: 20 }, 
      headerLeft: (props) => <HeaderBackButton {...props} />, 
      headerStyle: { backgroundColor: 'transparent' }, 
      headerShadowVisible: false,
      headerTransparent: false,
      header: (props) => {
        return (
          <Header
            {...props}
            headerLeftContainerStyle={{ paddingLeft: 16 }}
            headerRightContainerStyle={{ paddingRight: 16 }}
            headerStyle={[props.options.headerStyle, { height: 120 }]}
            headerTitleStyle={props.options.headerTitleStyle}
            title={typeof props.options.headerTitle === 'string' ? props.options.headerTitle : props.route.name}
            headerLeft={props.options.headerLeft}
            headerRight={props.options.headerRight}
          />
        );
      }
    }}>
      <Stack.Screen name="expenses/(screens)/submit" />
    </Stack>
  )
}