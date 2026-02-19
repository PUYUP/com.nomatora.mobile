import ItemEditor from "@/components/partials/item-editor";
import { useCreateMutation } from "@/redux/expense/expense-api";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EdgeInsets, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const useGradualAnimation = (insets: EdgeInsets) => {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: event => {
                "worklet";
                height.value = withTiming(Math.max(event.height, insets.bottom), { duration: 0 });
            },
        },
        [],
    );

    return { height };
};

export default function ItemEditorModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // expense
    const [createExpense, { data: createdExpenseData, isLoading }] = useCreateMutation();

    // keyboard
    const { height } = useGradualAnimation(insets);
    const fakeView = useAnimatedStyle(() => {
        return { height: Math.abs(height.value) - insets.bottom };
    }, [height, insets.bottom]);

    const onSavedCallback = async () => {
        router.back();
        router.push('/expenses/(screens)/submit');
    };

    // trigger first mounted
    useEffect(() => {
        createExpense();
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <Stack.Screen 
                options={{ 
                    headerShown: true,
                    headerTitle: 'Add Item',
                    headerShadowVisible: false,
                }} 
            />
            <View style={{ flex: 1, paddingBottom: 16 }}>
                {isLoading 
                    ? <ActivityIndicator size="large" /> 
                    : <ItemEditor 
                        visible={true}
                        onSaved={() => onSavedCallback()}
                        onClose={() => router.back()}
                        expenseId={createdExpenseData?.id ?? ""}
                    />
                }

                <Animated.View style={fakeView} />
            </View>
        </SafeAreaView>
    );
}
