import ExpenseItem from "@/components/partials/expense-item";
import ItemEditor from "@/components/partials/item-editor";
import { expenses as expensesSchema } from "@/database/schema/expense";
import { expenseItems as expenseItemsSchema } from "@/database/schema/expense-item";
import { ensureCameraPermission, openCameraSettings } from "@/libs/camera";
import { ExpenseData, useCreateMutation, useDeleteItemMutation, useGetItemsQuery, useUpdateExpenseMutation } from "@/redux/expense/expense-api";
import { useGetByKeyQuery } from "@/redux/general-settings-api";
import { AppDispatch, RootState } from "@/redux/store";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, FlatList, Keyboard, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const MAP_SELECTOR_ID = 'expense-location';

const useGradualAnimation = (insets: ReturnType<typeof useSafeAreaInsets>) => {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: event => {
                'worklet';
                height.value = withTiming(Math.max(event.height, insets.bottom), { duration: 0 });
            },
        },
        []
    );
    return { height };
};

export default function SubmitExpense() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // keyboard
    const { height } = useGradualAnimation(insets);
    const fakeView = useAnimatedStyle(() => {
        return { height: Math.abs(height.value) - insets.bottom };
    }, [height, insets.bottom]);
    
    // redux
    const dispatch = useDispatch<AppDispatch>();
    
    const [createExpense, { data: createdExpenseData }] = useCreateMutation();
    const [updateExpense, { data: updatedExpenseData }] = useUpdateExpenseMutation();
    const [deleteItem] = useDeleteItemMutation(); 
    const [draftedExpense, setDraftedExpense] = useState<typeof expensesSchema.$inferSelect | null>(null);
    const [draftedItems, setDraftedItems] = useState<typeof expenseItemsSchema.$inferSelect[]>([]);
    const { data: items, isLoading: isItemsLoading } = useGetItemsQuery(draftedExpense?.id!, {
        skip: !draftedExpense?.id,
    });

    // currency and language settings
    const { data: defaultCurrency } = useGetByKeyQuery('default_currency');
    const { data: defaultLanguage } = useGetByKeyQuery('default_language');

    const [showEditor, setShowEditor] = useState(false);
    const [editedItem, setEditedItem] = useState<typeof expenseItemsSchema.$inferSelect | null>(null);

    const {
        handleSubmit: handleSaveExpense,
        control: expenseFormControl,
        reset: resetExpenseForm,
    } = useForm<ExpenseData>();

    // get location based on their id
    // in this case the id is 'expense-location'
    const confirmedLocation = useSelector(
        (state: RootState) => state.mapPicker.locations[MAP_SELECTOR_ID]
    )

    const handleLocationPress = () => {
        dispatch({ type: 'mapPicker/openMap', payload: { requestId: MAP_SELECTOR_ID } });
        router.push({
            pathname: '/(modals)/location-selector-map',
            params: {
                purpose: 'expense',
                initialLat: confirmedLocation?.latitude?.toString(),
                initialLng: confirmedLocation?.longitude?.toString(),
                initialPlaceName: confirmedLocation?.placeName,
                requestId: MAP_SELECTOR_ID,
            }
        });
    };

    const handleSelectCurrency = () => {
        router.push({
            pathname: '/(modals)/currency-selector',
            params: {
                purpose: 'expense',
                initialCurrency: 'USD',
            }
        });
    }

    const handleManualAdd = () => {
        setEditedItem(null);
        setShowEditor(true);
    };

    const handleScanAdd = async () => {
        const { granted, status } = await ensureCameraPermission();
        if (!granted) {
            Alert.alert(
                'Camera permission needed',
                'Enable camera access to scan receipts.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => openCameraSettings() },
                ],
            );
            return;
        }
        router.push('/expenses/(screens)/scan');
    };

    const itemEditorOnSavedHandler = (item: typeof expenseItemsSchema.$inferSelect) => {
        setShowEditor(false);
    }

    const itemEditorOnCloseHandler = () => {
        handleCloseEditor();
    }

    const saveExpenseHandler = (data: ExpenseData) => {
        const payload: Partial<typeof expensesSchema.$inferSelect> = {
            ...draftedExpense,
            note: data.note || '',
            status: 'publish', // no longer draft when saving
        };

        if (draftedItems.length === 0 || (payload.place_name === '' || !payload.place_name)) {
            Alert.alert('No items or place', 'Please add at least one item and set a place before saving the expense.');
            return;
        }

        updateExpense({ id: draftedExpense?.id ?? '', payload: payload });
        resetExpenseForm();
        dispatch({ type: 'mapPicker/clearLocation', payload: { requestId: MAP_SELECTOR_ID } });
    }

    const handleCloseEditor = () => {
        setShowEditor(false);
        resetExpenseForm();
    };

    const handleEditItem = (item: typeof expenseItemsSchema.$inferSelect) => {
        setEditedItem(item);
        setShowEditor(true);
    };

    const handleRemoveItem = (item: typeof expenseItemsSchema.$inferSelect) => {
        console.log('Removing item with ID:', item.id);
        deleteItem(item.id);
    };

    useEffect(() => {
        // create or get draft expense when screen mounts
        createExpense();
    }, []);

    useEffect(() => {
        if (createdExpenseData || updatedExpenseData) {
            if (createdExpenseData) setDraftedExpense(createdExpenseData);
            if (updatedExpenseData) setDraftedExpense(updatedExpenseData);
        }
    }, [createdExpenseData, updatedExpenseData]);

    useEffect(() => {
        if (items && items.length > 0) {
            setDraftedItems(items);
        }
    }, [items]);

    useEffect(() => {
        if (!confirmedLocation || !confirmedLocation.placeName || !draftedExpense) {
            return;
        }

        updateExpense({
            id: draftedExpense?.id ?? '',
            payload: {
                place_name: confirmedLocation.placeName,
                latitude: parseFloat(confirmedLocation.latitude?.toString() ?? '0'),
                longitude: parseFloat(confirmedLocation.longitude?.toString() ?? '0'),
            },
        });
    }, [confirmedLocation]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Expense',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity style={styles.locationButton} onPress={handleSelectCurrency}>
                                <Text style={{ fontWeight: '700', fontSize: 12 }}>{defaultCurrency ? defaultCurrency.value : 'USD'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress}>
                                <MaterialCommunityIcons name="store-marker" size={24} color="#333" />
                                <View
                                    style={[
                                        styles.locationIndicator,
                                        { backgroundColor: draftedExpense?.place_name ? '#34C759' : '#FF3B30' },
                                    ]}
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            <View style={{ flex: 1, justifyContent: 'space-between' }}>
                {isItemsLoading 
                    ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" />
                        </View>
                    ) 
                    : (
                    <FlatList
                        bounces={true}
                        data={items}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <ExpenseItem
                                item={item}
                                currencyCode={defaultCurrency?.value ?? 'USD'}
                                languageCode={defaultLanguage?.value ?? 'en-US'}
                                onRemove={(item) => handleRemoveItem(item)}
                                onEdit={(item) => handleEditItem(item)}
                            />
                        )}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 16, flexGrow: 1 }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No items yet</Text>
                                <Text style={styles.emptyBody}>Tap the buttons below to scan/upload a receipt or add manually.</Text>
                                
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity style={styles.emptyAddButton} onPress={handleManualAdd}>
                                        <MaterialCommunityIcons name="basket-plus" size={20} color="#111" />
                                        <Text style={styles.emptyAddButtonText}>Add Item</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.emptyAddButton, styles.emptyScanButton]} onPress={handleScanAdd}>
                                        <MaterialCommunityIcons name="line-scan" size={20} color="#111" />
                                        <Text style={styles.emptyAddButtonText}>Scan</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Bottom input */}
            <View style={[styles.footer]}>
                <View style={styles.actionsContainer}>
                    <View style={styles.noteContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#555" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {draftedExpense?.place_name ? draftedExpense.place_name : 'Location not set'}
                            </Text>
                        </View>
    
                        <Controller
                            control={expenseFormControl}
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
                            name="note"
                        />
                    </View>

                    <View style={styles.rowActions}>
                        <TouchableOpacity style={[styles.primaryButton, styles.halfWidthButton]} onPress={(handleSaveExpense(saveExpenseHandler))}>
                            <Text style={styles.primaryButtonText}>Save Expense</Text>
                        </TouchableOpacity>

                        <View style={styles.iconButtons}>
                            <TouchableOpacity style={styles.iconButton} onPress={handleScanAdd}>
                                <MaterialCommunityIcons name="line-scan" size={22} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={handleManualAdd}>
                                <MaterialCommunityIcons name="basket-plus" size={22} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        
            <Animated.View style={fakeView} />

            <Modal
                visible={showEditor}
                transparent={false}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleCloseEditor}
                onDismiss={() => setShowEditor(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
                        <View style={{ flex: 1, paddingBottom: 16 }}>
                            <View style={styles.editorHeader}>
                                <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseEditor}>
                                    <MaterialCommunityIcons name="chevron-left" size={30} color="#111" style={{ marginRight: 1 }} />
                                </TouchableOpacity>
                                <Text style={styles.editorTitle}>{editedItem ? 'Edit Item' : 'Add Item'}</Text>
                            </View>
                            <ItemEditor 
                                visible={true}
                                onSaved={(item) => itemEditorOnSavedHandler(item)}
                                onClose={() => itemEditorOnCloseHandler()}
                                expenseId={draftedExpense?.id ?? ""}
                                initialValues={editedItem ?? {}}
                            />

                            <Animated.View style={fakeView} />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    footer: {
        padding: 16,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: '#E5E5E5',
    },
    actionsContainer: {
        gap: 10,
    },
    noteContainer: {
        gap: 6,
    },
    locationText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        paddingRight: 16,
    },
    noteInput: {
        minHeight: 50,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
        textAlignVertical: 'top',
        fontSize: 14,
        color: '#111',
    },
    locationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
        position: 'relative',
    },
    locationIndicator: {
        width: 10,
        height: 10,
        borderRadius: 6,
        position: 'absolute',
        top: 6,
        right: 6,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    halfWidthButton: {
        flex: 1,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 6,
    },
    emptyBody: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyAddButton: {
        marginTop: 4,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#F4F4F4',
        minWidth: 132,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyScanButton: {
        backgroundColor: '#EFEFFF',
        borderColor: '#D0D0FF',
    },
    emptyAddButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
    },
    primaryButton: {
        backgroundColor: '#111',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalCloseButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
    },
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    editorTitle: {
        fontSize: 22,
        color: '#111',
        marginRight: 50,
        flex: 1,
        fontFamily: 'ZalandoSansExpanded_900Black',
        textAlign: Platform.OS === 'ios' ? 'center' : 'left',
    },
});