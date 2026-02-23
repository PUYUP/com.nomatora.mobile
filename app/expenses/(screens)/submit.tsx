import ExpenseItem from "@/components/partials/expense-item";
import ItemEditor from "@/components/partials/item-editor";
import { expenses as expensesSchema } from "@/database/schema/expense";
import { expenseItems as expenseItemsSchema } from "@/database/schema/expense-item";
import { ensureCameraPermission, openCameraSettings } from "@/libs/camera";
import {
    ExpenseData,
    useCreateMutation,
    useDeleteItemMutation,
    useGetItemsQuery,
    useUpdateExpenseMutation,
} from "@/redux/expense/expense-api";
import { useGetByKeyQuery } from "@/redux/general-settings-api";
import { AppDispatch, RootState } from "@/redux/store";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_SELECTOR_ID = "expense-location";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseRecord = typeof expensesSchema.$inferSelect;
type ExpenseItemRecord = typeof expenseItemsSchema.$inferSelect;

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useKeyboardOffset(insets: ReturnType<typeof useSafeAreaInsets>) {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: (event) => {
                "worklet";
                height.value = withTiming(Math.max(event.height, insets.bottom), { duration: 0 });
            },
        },
        []
    );

    const animatedStyle = useAnimatedStyle(
        () => ({ height: Math.abs(height.value) - insets.bottom }),
        [height, insets.bottom]
    );

    return animatedStyle;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface HeaderActionsProps {
    currencyValue: string;
    hasLocation: boolean;
    onCurrencyPress: () => void;
    onLocationPress: () => void;
}

function HeaderActions({ currencyValue, hasLocation, onCurrencyPress, onLocationPress }: HeaderActionsProps) {
    return (
        <View style={styles.headerActions}>
            <TouchableOpacity
                style={styles.locationButton}
                onPress={onCurrencyPress}
                accessibilityLabel="Select currency"
            >
                <Text style={styles.currencyLabel}>{currencyValue}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.locationButton}
                onPress={onLocationPress}
                accessibilityLabel="Select location"
            >
                <MaterialCommunityIcons name="store-marker" size={24} color="#333" />
                <View
                    style={[
                        styles.locationIndicator,
                        { backgroundColor: hasLocation ? "#34C759" : "#FF3B30" },
                    ]}
                />
            </TouchableOpacity>
        </View>
    );
}

interface EmptyStateProps {
    onManualAdd: () => void;
    onScanAdd: () => void;
}

function EmptyState({ onManualAdd, onScanAdd }: EmptyStateProps) {
    return (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyBody}>
                Tap the buttons below to scan/upload a receipt or add manually.
            </Text>
            <View style={styles.emptyActions}>
                <TouchableOpacity style={styles.emptyAddButton} onPress={onManualAdd} accessibilityLabel="Add item manually">
                    <MaterialCommunityIcons name="basket-plus" size={20} color="#111" />
                    <Text style={styles.emptyAddButtonText}>Add Item</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.emptyAddButton, styles.emptyScanButton]}
                    onPress={onScanAdd}
                    accessibilityLabel="Scan receipt"
                >
                    <MaterialCommunityIcons name="line-scan" size={20} color="#111" />
                    <Text style={styles.emptyAddButtonText}>Scan</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface FooterProps {
    placeName: string | null | undefined;
    control: ReturnType<typeof useForm<ExpenseData>>["control"];
    onSave: () => void;
    onScan: () => void;
    onManualAdd: () => void;
}

function Footer({ placeName, control, onSave, onScan, onManualAdd }: FooterProps) {
    return (
        <View style={styles.footer}>
            <View style={styles.actionsContainer}>
                <View style={styles.noteContainer}>
                    <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker-radius" size={16} color="#555" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {placeName ?? "Location not set"}
                        </Text>
                    </View>

                    <Controller
                        control={control}
                        name="note"
                        rules={{ required: false }}
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                placeholder="Write note here..."
                                multiline
                                style={styles.noteInput}
                            />
                        )}
                    />
                </View>

                <View style={styles.rowActions}>
                    <TouchableOpacity
                        style={[styles.primaryButton, styles.halfWidthButton]}
                        onPress={onSave}
                        accessibilityLabel="Save expense"
                    >
                        <Text style={styles.primaryButtonText}>Save Expense</Text>
                    </TouchableOpacity>

                    <View style={styles.iconButtons}>
                        <TouchableOpacity style={styles.iconButton} onPress={onScan} accessibilityLabel="Scan receipt">
                            <MaterialCommunityIcons name="line-scan" size={22} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton} onPress={onManualAdd} accessibilityLabel="Add item manually">
                            <MaterialCommunityIcons name="basket-plus" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}

interface ItemEditorModalProps {
    visible: boolean;
    editedItem: ExpenseItemRecord | null;
    expenseId: string;
    insets: ReturnType<typeof useSafeAreaInsets>;
    keyboardOffsetStyle: ReturnType<typeof useKeyboardOffset>;
    onClose: () => void;
    onSaved: (item: ExpenseItemRecord) => void;
}

function ItemEditorModal({
    visible,
    editedItem,
    expenseId,
    insets,
    keyboardOffsetStyle,
    onClose,
    onSaved,
}: ItemEditorModalProps) {
    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
            onDismiss={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    <View style={styles.modalInner}>
                        <View style={styles.editorHeader}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={onClose}
                                accessibilityLabel="Close editor"
                            >
                                <MaterialCommunityIcons name="chevron-left" size={30} color="#111" style={styles.chevronOffset} />
                            </TouchableOpacity>
                            <Text style={styles.editorTitle}>
                                {editedItem ? "Edit Item" : "Add Item"}
                            </Text>
                        </View>

                        <ItemEditor
                            visible
                            onSaved={onSaved}
                            onClose={onClose}
                            expenseId={expenseId}
                            initialValues={editedItem ?? {}}
                        />

                        <Animated.View style={keyboardOffsetStyle} />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubmitExpense() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch<AppDispatch>();
    const keyboardOffsetStyle = useKeyboardOffset(insets);

    // ── Server state ──────────────────────────────────────────────────────────
    const [createExpense, { data: createdExpenseData }] = useCreateMutation();
    const [updateExpense, { data: updatedExpenseData }] = useUpdateExpenseMutation();
    const [deleteItem] = useDeleteItemMutation();

    const { data: defaultCurrency } = useGetByKeyQuery("default_currency");
    const { data: defaultLanguage } = useGetByKeyQuery("default_language");

    // ── Local state ───────────────────────────────────────────────────────────
    const [draftedExpense, setDraftedExpense] = useState<ExpenseRecord | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editedItem, setEditedItem] = useState<ExpenseItemRecord | null>(null);

    const { data: items, isLoading: isItemsLoading } = useGetItemsQuery(draftedExpense?.id!, {
        skip: !draftedExpense?.id,
    });

    const confirmedLocation = useSelector(
        (state: RootState) => state.mapPicker.locations[MAP_SELECTOR_ID]
    );

    const {
        handleSubmit: handleSaveExpense,
        control: expenseFormControl,
        reset: resetExpenseForm,
    } = useForm<ExpenseData>();

    // ── Effects ───────────────────────────────────────────────────────────────

    // Create a draft expense on mount
    useEffect(() => {
        createExpense();
    }, []);

    // Sync created/updated expense into local state
    useEffect(() => {
        if (createdExpenseData) setDraftedExpense(createdExpenseData);
    }, [createdExpenseData]);

    useEffect(() => {
        if (updatedExpenseData) setDraftedExpense(updatedExpenseData);
    }, [updatedExpenseData]);

    // Persist confirmed location into the draft expense
    useEffect(() => {
        if (!confirmedLocation?.placeName || !draftedExpense?.id) return;

        updateExpense({
            id: draftedExpense.id,
            payload: {
                place_name: confirmedLocation.placeName,
                latitude: parseFloat(confirmedLocation.latitude?.toString() ?? "0"),
                longitude: parseFloat(confirmedLocation.longitude?.toString() ?? "0"),
            },
        });
    }, [confirmedLocation]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleLocationPress = useCallback(() => {
        dispatch({ type: "mapPicker/openMap", payload: { requestId: MAP_SELECTOR_ID } });
        router.push({
            pathname: "/(modals)/location-selector-map",
            params: {
                purpose: "expense",
                initialLat: confirmedLocation?.latitude?.toString(),
                initialLng: confirmedLocation?.longitude?.toString(),
                initialPlaceName: confirmedLocation?.placeName,
                requestId: MAP_SELECTOR_ID,
            },
        });
    }, [confirmedLocation, dispatch, router]);

    const handleSelectCurrency = useCallback(() => {
        router.push({
            pathname: "/(modals)/currency-selector",
            params: { purpose: "expense", initialCurrency: "USD" },
        });
    }, [router]);

    const handleManualAdd = useCallback(() => {
        setEditedItem(null);
        setShowEditor(true);
    }, []);

    const handleScanAdd = useCallback(async () => {
        const { granted } = await ensureCameraPermission();
        if (!granted) {
            Alert.alert(
                "Camera permission needed",
                "Enable camera access to scan receipts.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: openCameraSettings },
                ]
            );
            return;
        }
        router.push("/expenses/(screens)/scan");
    }, [router]);

    const handleCloseEditor = useCallback(() => {
        setShowEditor(false);
        setEditedItem(null);
        resetExpenseForm();
    }, [resetExpenseForm]);

    const handleEditorSaved = useCallback((_item: ExpenseItemRecord) => {
        setShowEditor(false);
    }, []);

    const handleEditItem = useCallback((item: ExpenseItemRecord) => {
        setEditedItem(item);
        setShowEditor(true);
    }, []);

    const handleRemoveItem = useCallback(
        (item: ExpenseItemRecord) => {
            deleteItem(item.id);
        },
        [deleteItem]
    );

    const handleSaveExpenseSubmit = useCallback(
        (data: ExpenseData) => {
            if (!items?.length) {
                Alert.alert("No items", "Please add at least one item before saving.");
                return;
            }
            if (!draftedExpense?.place_name) {
                Alert.alert("No location", "Please set a place before saving the expense.");
                return;
            }

            const payload: Partial<ExpenseRecord> = {
                ...draftedExpense,
                note: data.note ?? "",
                status: "publish",
            };

            updateExpense({ id: draftedExpense.id, payload });
            resetExpenseForm();
            dispatch({ type: "mapPicker/clearLocation", payload: { requestId: MAP_SELECTOR_ID } });
        },
        [draftedExpense, items, updateExpense, resetExpenseForm, dispatch]
    );

    // ── Render ────────────────────────────────────────────────────────────────

    const currencyCode = defaultCurrency?.value ?? "USD";
    const languageCode = defaultLanguage?.value ?? "en-US";

    return (
        <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
            <Stack.Screen
                options={{
                    headerTitle: "Expense",
                    headerRight: () => (
                        <HeaderActions
                            currencyValue={currencyCode}
                            hasLocation={!!draftedExpense?.place_name}
                            onCurrencyPress={handleSelectCurrency}
                            onLocationPress={handleLocationPress}
                        />
                    ),
                }}
            />

            <View style={styles.content}>
                {isItemsLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                ) : (
                    <FlatList
                        bounces
                        data={items}
                        keyboardShouldPersistTaps="handled"
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <ExpenseItem
                                item={item}
                                currencyCode={currencyCode}
                                languageCode={languageCode}
                                onRemove={handleRemoveItem}
                                onEdit={handleEditItem}
                            />
                        )}
                        ListEmptyComponent={
                            <EmptyState onManualAdd={handleManualAdd} onScanAdd={handleScanAdd} />
                        }
                    />
                )}
            </View>

            <Footer
                placeName={draftedExpense?.place_name}
                control={expenseFormControl}
                onSave={handleSaveExpense(handleSaveExpenseSubmit)}
                onScan={handleScanAdd}
                onManualAdd={handleManualAdd}
            />

            <Animated.View style={keyboardOffsetStyle} />

            <ItemEditorModal
                visible={showEditor}
                editedItem={editedItem}
                expenseId={draftedExpense?.id ?? ""}
                insets={insets}
                keyboardOffsetStyle={keyboardOffsetStyle}
                onClose={handleCloseEditor}
                onSaved={handleEditorSaved}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
        justifyContent: "space-between",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 16,
        flexGrow: 1,
    },
    // Header
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    currencyLabel: {
        fontWeight: "700",
        fontSize: 12,
    },
    locationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        backgroundColor: "#FFF",
        position: "relative",
    },
    locationIndicator: {
        width: 10,
        height: 10,
        borderRadius: 6,
        position: "absolute",
        top: 6,
        right: 6,
    },
    // Footer
    footer: {
        padding: 16,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: "#E5E5E5",
    },
    actionsContainer: {
        gap: 10,
    },
    noteContainer: {
        gap: 6,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    locationText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "600",
        paddingRight: 16,
    },
    noteInput: {
        minHeight: 50,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        backgroundColor: "#FFF",
        textAlignVertical: "top",
        fontSize: 14,
        color: "#111",
    },
    rowActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    halfWidthButton: {
        flex: 1,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    iconButtons: {
        flexDirection: "row",
        gap: 8,
    },
    iconButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        backgroundColor: "#FFF",
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
        marginBottom: 6,
    },
    emptyBody: {
        fontSize: 14,
        color: "#555",
        textAlign: "center",
        marginBottom: 12,
    },
    emptyActions: {
        flexDirection: "row",
        gap: 12,
    },
    emptyAddButton: {
        marginTop: 4,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E0E0E0",
        backgroundColor: "#F4F4F4",
        minWidth: 132,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    emptyScanButton: {
        backgroundColor: "#EFEFFF",
        borderColor: "#D0D0FF",
    },
    emptyAddButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111",
    },
    // Primary button
    primaryButton: {
        backgroundColor: "#111",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    // Modal
    modalContainer: {
        flex: 1,
    },
    modalInner: {
        flex: 1,
        paddingBottom: 16,
    },
    modalCloseButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E5E5E5",
        backgroundColor: "#FFFFFF",
    },
    chevronOffset: {
        marginRight: 1,
    },
    editorHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    editorTitle: {
        fontSize: 22,
        color: "#111",
        marginRight: 50,
        flex: 1,
        fontFamily: "ZalandoSansExpanded_900Black",
        textAlign: Platform.OS === "ios" ? "center" : "left",
    },
});