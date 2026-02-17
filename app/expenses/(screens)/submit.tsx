import ExpenseItem from "@/components/partials/expense-item";
import { ensureCameraPermission, openCameraSettings } from "@/libs/camera";
import { ExpenseData, ExpenseItemData } from "@/redux/expense/slice";
import { RootState } from "@/redux/store";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as Crypto from 'expo-crypto';
import { Stack, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, BackHandler, FlatList, InteractionManager, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const CATEGORY_OPTIONS = [
    'Groceries',
    'Medical',
    'Office',
    'Electronics',
    'Food',
    'Transport',
];

const CATEGORY_COLUMNS = 2;

const CategoryChip = memo(function CategoryChip({
    item,
    selected,
    onSelect,
}: {
    item: string;
    selected: boolean;
    onSelect: (value: string) => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.categoryChip, selected && styles.categoryChipSelected]}
            onPress={() => onSelect(item)}
        >
            <View style={styles.categoryChipContent}>
                <MaterialCommunityIcons
                    name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                    size={16}
                    color={selected ? '#2E7D32' : '#9AA0A6'}
                />
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{item}</Text>
            </View>
        </TouchableOpacity>
    );
});

const useGradualAnimation = (insets: ReturnType<typeof useSafeAreaInsets>) => {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: event => {
                'worklet';
                height.value = withTiming(Math.max(event.height, 0), { duration: 0 });
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
        return {
            height: Math.abs(height.value) - insets.bottom,
        };
    }, [height, insets.bottom]);
    
    // redux
    const expenseItems = useSelector((state: RootState) => state.expense.items);
    const expenseDraft = useSelector((state: RootState) => state.expense);
    const dispatch = useDispatch();
    
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [categories, setCategories] = useState<string[]>(CATEGORY_OPTIONS);
    const [showEditor, setShowEditor] = useState(false);
    const [addCategoryVisible, setAddCategoryVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editedItem, setEditedItem] = useState<ExpenseItemData | null>(null);
    const itemNameRef = useRef<TextInput | null>(null);
    const editorScrollRef = useRef<ScrollView | null>(null);
    const shouldFocusNameRef = useRef(false);
    const inlineCategoryY = useRef(0);
    const placeName = '291-275 Bedford Ave, Brooklyn, NY 11211, United States';

    // item form
    const {
        handleSubmit: saveOrUpdateItem,
        control: itemFormControl,
        setValue: setItemFormValue,
        reset: resetItemForm,
        getValues: getItemFormValues,
    } = useForm<ExpenseItemData>();

    const {
        handleSubmit: handleSaveExpense,
        control: expenseFormControl,
        reset: resetExpenseForm,
    } = useForm<ExpenseData>();

    const itemValues = useWatch({ control: itemFormControl, name: ['name', 'price', 'category'] });
    const selectedCategory = useWatch({ control: itemFormControl, name: 'category' });
    const renderCategoryItem = useCallback(({ item }: { item: string }) => {
        return (
            <CategoryChip
                item={item}
                selected={selectedCategory === item}
                onSelect={(value) => setItemFormValue('category', value)}
            />
        );
    }, [selectedCategory, setItemFormValue]);

    const categoryKeyExtractor = useCallback((item: string) => item, []);
    const focusNameInput = useCallback(() => {

        if (!shouldFocusNameRef.current) return;
        if (editedItem) return; // do not focus if it's editing an existing item

        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                if (!shouldFocusNameRef.current) return;
                const node = itemNameRef.current;
                if (!node) return;
                node.focus?.();
            }, 60);
        });
    }, [editedItem]);

    const handleLocationPress = () => {
        dispatch({ type: 'expense/updateExpense', payload: { placeName: expenseDraft.placeName ? '' : placeName } });
    };

    const handleManualAdd = () => {
        resetItemForm();
        setEditedItem(null);
        setAddCategoryVisible(false);
        shouldFocusNameRef.current = true; // only focus for new item
        setShowEditor(true);
    };

    const handleScanAdd = async () => {
        const { granted, status } = await ensureCameraPermission();
        console.log('Camera permission status:', status);
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

    /**
     * Saves a new item or updates an existing one based on the presence of an ID in the data.
     * 
     * @param data ExpenseItemData
     */
    const handleSaveItem = async (data: ExpenseItemData) => {  
        const id = data.id ?? Crypto.randomUUID().toString();
        const trimmedName = data.name.trim();
        const now = Date.now();
        const payload: ExpenseItemData = {
            id: id,
            expenseId: 'temp-expense-id',
            name: trimmedName,
            price: data.price,
            timestamp: Date.now(),
            category: data.category || 'Uncategorized',
            quantity: data.quantity ? data.quantity : 1,
            createdAt: now,
            updatedAt: now,
        };

        if (data.id) {
            // update existing item
            dispatch({ type: 'expense/updateItem', payload: payload });
        } else {
            // add new item
            dispatch({ type: 'expense/addItem', payload });
        }
    
        resetItemForm();
        setShowEditor(false);
        shouldFocusNameRef.current = false;
        setEditedItem(null);
    }

    const saveExpense = (data: ExpenseData) => {
        dispatch({ type: 'expense/updateExpense', payload: { note: data.note } });
        const payload = {
            ...expenseDraft,
            note: data.note,
        };

        if (payload.items.length === 0 || payload.placeName === '') {
            Alert.alert('No items or place', 'Please add at least one item and set a place before saving the expense.');
            return;
        }

        resetExpenseForm();
        dispatch({ type: 'expense/resetState' });
    }

    const handleCloseEditor = () => {
        setAddCategoryVisible(false);
        setShowEditor(false);
        resetExpenseForm();
    };

    const handleAddCategory = () => {
        setNewCategoryName('');
        setAddCategoryVisible(true);
    };

    const handleSubmitCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        if (categories.length >= 10) {
            Alert.alert('Category limit reached', 'You can only keep up to 10 categories.');
            return;
        }

        setCategories((prev) => {
            const exists = prev.some((cat) => cat.toLowerCase() === trimmed.toLowerCase());
            if (exists) return prev;
            return [...prev, trimmed];
        });
        setItemFormValue('category', trimmed);
        setNewCategoryName('');
        setAddCategoryVisible(false);
    };

    const handleCancelCategory = () => {
        setNewCategoryName('');
        setAddCategoryVisible(false);
    };

    const handleEditItem = (id: string) => {
        const found = expenseItems.find((item) => item.id === id);
        if (!found) return;

        for (const key in found) {
            const _k = key as keyof ExpenseItemData;
            if (_k === 'price') {
                setItemFormValue(_k, found[_k].toString());
            } else {
                setItemFormValue(_k, found[_k]);
            }
        }

        setEditedItem(found);
        setAddCategoryVisible(false);
        shouldFocusNameRef.current = false; // do not autofocus when editing
        setShowEditor(true);
    };

    const handleRemoveItem = (id: string) => {
        dispatch({ type: 'expense/removeItem', payload: id });
    };

    useEffect(() => {
        if (!showEditor) return;
        shouldFocusNameRef.current = true;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleCloseEditor();
            Keyboard.dismiss();
            return true;
        });
        return () => sub.remove();
    }, [showEditor]);

    useEffect(() => {
        if (!addCategoryVisible) return;
        setTimeout(() => {
            const targetY = inlineCategoryY.current > 0 ? Math.max(inlineCategoryY.current - 12, 0) : 0;
            editorScrollRef.current?.scrollTo({ y: targetY, animated: true });
        }, 120);
    }, [addCategoryVisible]);

    useEffect(() => {
        if (!showEditor) return;
        focusNameInput();
    }, [showEditor, focusNameInput]);

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                setIsKeyboardVisible(true);
            }
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
                setKeyboardHeight(0);
                setIsKeyboardVisible(false);

                const noValues = itemValues.every((value) => !value || value === '');
                if (noValues && showEditor) {
                    handleCloseEditor();
                }
            }
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [itemValues]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Expense Update',
                    headerRight: () => (
                        <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress}>
                            <MaterialCommunityIcons name="store-marker" size={26} color="#333" />
                            <View
                                style={[
                                    styles.locationIndicator,
                                    { backgroundColor: expenseDraft.placeName ? '#34C759' : '#FF3B30' },
                                ]}
                            />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <FlatList
                    bounces={false}
                    overScrollMode="never"
                    data={expenseItems}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                        <ExpenseItem
                            {...item}
                            onRemove={() => handleRemoveItem(item.id)}
                            onEdit={() => handleEditItem(item.id)}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12, flexGrow: 1, backgroundColor: 'whitesmoke' }}
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
            </View>

            {/* Bottom input */}
            <View style={[styles.footer]}>
                <View style={styles.actionsContainer}>
                    <View style={styles.noteContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#555" />
                            <Text style={styles.locationText} numberOfLines={1}>{expenseDraft.placeName ? expenseDraft.placeName : 'Location not set'}</Text>
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
                        <TouchableOpacity style={[styles.primaryButton, styles.halfWidthButton]} onPress={(handleSaveExpense(saveExpense))}>
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
                onShow={focusNameInput}
                onDismiss={() => setShowEditor(false)}
            >
                <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
                    <View style={styles.editorHeader}>
                        <Text style={styles.editorTitle}>{getItemFormValues('id') ? 'Edit Item' : 'New Item'}</Text>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseEditor}>
                            <MaterialCommunityIcons name="close" size={22} color="#111" />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.editorContent, { padding: 0, paddingBottom: insets.bottom }]}>
                        <ScrollView
                            ref={editorScrollRef}
                            style={[styles.modalScroll, { marginBottom: addCategoryVisible ? 0 : 20, paddingHorizontal: 20 }]}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={true}
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                            overScrollMode="never"
                        >
                            <Controller
                                control={itemFormControl}
                                rules={{ required: true }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        ref={itemNameRef}
                                        value={value}
                                        onChangeText={onChange}
                                        onBlur={onBlur}
                                        placeholder="Item name"
                                        multiline
                                        onLayout={focusNameInput}
                                        style={styles.itemNameInput}
                                    />
                                )}
                                name="name"
                            />

                            <Text style={styles.priceLabel}>Item Price</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.pricePrefix}>$</Text>
                                <Controller
                                    control={itemFormControl}
                                    rules={{ required: true }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                            style={styles.priceInput}
                                        />
                                    )}
                                    name="price"
                                />
                            </View>

                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryLabel}>Category</Text>
                                {!addCategoryVisible && (
                                    <TouchableOpacity style={styles.categoryAddButton} onPress={handleAddCategory}>
                                        <MaterialCommunityIcons name="plus" size={16} />
                                        <Text style={styles.categoryAddText}>Add</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {addCategoryVisible ? (
                                <View
                                    style={styles.inlineCategoryContainer}
                                    onLayout={(e) => {
                                        inlineCategoryY.current = e.nativeEvent.layout.y;
                                    }}
                                >
                                    <TextInput
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                        placeholder="Category name"
                                        style={styles.addCategoryInput}
                                        autoFocus
                                    />
                                    <View style={styles.addCategoryActions}>
                                        <TouchableOpacity style={[styles.secondaryButton, styles.modalActionButton]} onPress={handleCancelCategory}>
                                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.primaryButton, styles.modalActionButton]} onPress={handleSubmitCategory}>
                                            <Text style={styles.primaryButtonText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <FlatList
                                    data={categories}
                                    keyExtractor={categoryKeyExtractor}
                                    renderItem={({ item }) => renderCategoryItem({ item })}
                                    extraData={selectedCategory}
                                    numColumns={CATEGORY_COLUMNS}
                                    scrollEnabled={false}
                                    columnWrapperStyle={styles.categoryRow}
                                    contentContainerStyle={styles.categoryListContent}
                                    keyboardShouldPersistTaps="handled"
                                />
                            )}
                        </ScrollView>

                        {!addCategoryVisible && (
                            <View style={[styles.modalFooterButtons]}>
                                <TouchableOpacity style={[styles.primaryButton, styles.modalActionButton]} onPress={saveOrUpdateItem(handleSaveItem)}>
                                    <Text style={styles.primaryButtonText}>Save Item</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <Animated.View style={fakeView} />
                </View>
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
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFF',
        position: 'relative',
    },
    locationIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        position: 'absolute',
        top: 8,
        right: 8,
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
    secondaryButton: {
        backgroundColor: '#F4F4F4',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    secondaryButtonText: {
        color: '#333',
        fontSize: 15,
        fontWeight: '500',
    },
    editorContent: {
        flex: 1,
        padding: 20,
    },
    addCategoryInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111',
        backgroundColor: '#F8F8F8',
    },
    addCategoryActions: {
        flexDirection: 'row',
        gap: 10,
    },
    inlineCategoryContainer: {
        gap: 10,
    },
    modalCloseButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F2F2F2',
    },
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 4,
        paddingHorizontal: 20,
    },
    editorTitle: {
        fontSize: 22,
        color: '#111',
        fontFamily: 'ZalandoSansExpanded_900Black',
    },
    modalScroll: {
        flex: 1,
    },
    modalScrollContent: {
        flexGrow: 1,
        gap: 16,
    },
    itemNameInput: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111',
        minHeight: 40,
        textAlignVertical: 'top',
        paddingRight: 52,
        paddingLeft: 0,
    },
    priceLabel: {
        fontSize: 14,
        color: '#555',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderColor: '#E0E0E0',
        paddingBottom: 8,
    },
    pricePrefix: {
        fontSize: 24,
        color: '#444',
    },
    priceInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        color: '#111',
        paddingVertical: 0,
    },
    categoryLabel: {
        fontSize: 14,
        color: '#555',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: '#EFEFFF',
        borderColor: '#D0D0FF',
    },
    categoryAddText: {
        fontSize: 13,
        fontWeight: '600',
    },
    categoryListContent: {
        gap: 10,
    },
    categoryRow: {
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: '#F4F6FB',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    categoryChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    categoryChipSelected: {
        backgroundColor: '#E4F5EB',
    },
    categoryChipText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    categoryChipTextSelected: {
        color: '#2E7D32',
        fontWeight: '700',
    },
    modalFooterButtons: {
        paddingHorizontal: 20,
    },
    modalActionButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
});