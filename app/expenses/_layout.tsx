import HeaderBackButton from "@/components/partials/header-back-button";
import { Stack } from "expo-router";

export default function ExpensesLayout() {
  return (
    <Stack screenOptions={{ 
      headerTitleStyle: { fontFamily: 'ZalandoSansExpanded_900Black', fontSize: 20 }, 
      headerLeft: (props) => <HeaderBackButton {...props} />, 
      headerShadowVisible: false,
    }}>
      <Stack.Screen name="expenses/(screens)/submit" />
    </Stack>
  )
}