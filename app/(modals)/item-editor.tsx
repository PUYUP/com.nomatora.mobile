import ItemEditor from "@/components/partials/item-editor";
import { useCreateMutation } from "@/redux/expense/expense-api";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EdgeInsets, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Tracks keyboard height in a worklet-compatible shared value.
 * The animated height respects the bottom safe-area inset so content
 * never slides up too far on devices with a home indicator.
 */
function useKeyboardOffset(insets: EdgeInsets) {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: (event) => {
                "worklet";
                height.value = withTiming(Math.max(event.height, insets.bottom), { duration: 0 });
            },
        },
        [],
    );

    return height;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItemEditorModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [createExpense, { data: createdExpenseData, isLoading, isError }] = useCreateMutation();

    // FIX #1: await the mutation and surface errors — fire only once on mount
    useEffect(() => {
        createExpense().catch((error) => {
            console.error('[ItemEditorModal] Failed to create expense draft:', error);
            router.back();
        });
    }, [createExpense]);

    // FIX #3: useAnimatedStyle worklets don't need a deps array
    const keyboardHeight = useKeyboardOffset(insets);
    const keyboardSpacerStyle = useAnimatedStyle(() => ({
        height: Math.max(0, keyboardHeight.value - insets.bottom),
    }));

    // FIX #2 + #6: not async — router methods are synchronous
    const handleSaved = useCallback(() => {
        router.back();
        router.push('/expenses/(screens)/submit');
    }, [router]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    // FIX #8: don't render the editor until we have a valid ID
    const expenseId = createdExpenseData?.id;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{ headerTitle: 'Add Item' }} />

            <View style={styles.content}>
                {/* FIX #4: centered loading state */}
                {(isLoading || !expenseId) && !isError && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                )}

                {isError && (
                    // Render nothing — useEffect above already navigated back.
                    // Slot kept here so future error UI (e.g. toast) can be added.
                    null
                )}

                {!isLoading && !isError && expenseId && (
                    <ItemEditor
                        visible
                        expenseId={expenseId}
                        onSaved={handleSaved}
                        onClose={handleClose}
                    />
                )}

                <Animated.View style={keyboardSpacerStyle} />
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingBottom: 16,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});