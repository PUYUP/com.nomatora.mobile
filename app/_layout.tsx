import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';

import HeaderBackButton from '@/components/partials/header-back-button';
import { runMigrations } from '@/database/migrate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/redux/store';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_900Black } from '@expo-google-fonts/inter';
import { Playfair_400Regular, Playfair_600SemiBold, Playfair_900Black, Playfair_900Black_Italic, useFonts } from '@expo-google-fonts/playfair';
import { ZalandoSansExpanded_900Black } from '@expo-google-fonts/zalando-sans-expanded';
import { Header } from '@react-navigation/elements';
import { useEffect } from 'react';
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Provider } from 'react-redux';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#000000',
    },
  };

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#FFFFFF',
    },
  };

  let [fontsLoaded] = useFonts({
    Playfair_400Regular,
    Playfair_600SemiBold,
    Playfair_900Black,
    Playfair_900Black_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_900Black,
    ZalandoSansExpanded_900Black,
  });

  useEffect(() => {
    (async () => {
      await runMigrations();
    })();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : customLightTheme}>
        <KeyboardProvider>
          <Stack 
            screenOptions={{ 
              headerLeft: (props) => <HeaderBackButton {...props} />,
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
                  />
                );
              }
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(modals)" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="expenses" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'fullScreenModal', title: 'Modal' }} />
          </Stack>
        </KeyboardProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  headerBackTileStyle: {
    backgroundColor: 'red',
  },
});
