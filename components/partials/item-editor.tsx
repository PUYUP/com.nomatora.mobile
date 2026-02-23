import { UX_ZERO_DECIMAL } from "@/constants/settings";
import { expenseItems } from "@/database/schema/expense-item";
import { itemCategories } from "@/database/schema/expense-item-category";
import { useCreateMutation as useCreateCategoryMutation, useGetAllQuery } from "@/redux/expense/category-api";
import { useAddItemMutation, useUpdateItemMutation } from "@/redux/expense/expense-api";
import { useGetByKeyQuery } from "@/redux/general-settings-api";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    FlatList,
    InteractionManager,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import CurrencyInput from "react-native-currency-input";

// ─── Types ────────────────────────────────────────────────────────────────────

const CATEGORY_COLUMNS = 3;

export type ItemCategory = typeof itemCategories.$inferSelect;
export type ItemRecord = typeof expenseItems.$inferSelect;

type InsertPayload = Omit<typeof expenseItems.$inferInsert, 'id'>;

export type ItemEditorValues = {
    id?: string;
    name: string;
    price: number | string;
    category?: string | null;
};

export type ItemEditorProps = {
    visible: boolean;
    initialValues?: Partial<ItemEditorValues>;
    onClose: () => void;
    onSaved?: (item: ItemRecord) => void;
    maxCategories?: number;
    isSaving?: boolean;
    expenseId: string;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function resolveCurrencyFormat(locale: string, currency: string): { symbol: string; maximumFD: number } {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    const maximumFD = UX_ZERO_DECIMAL.includes(currency)
        ? 0
        : (formatter.resolvedOptions().maximumFractionDigits ?? 2);

    let symbol = currency;
    try {
        if (typeof formatter.formatToParts === 'function') {
            symbol = formatter.formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
        } else {
            symbol = formatter.format(0).replace(/[\d\s.,-]/g, '') || currency;
        }
    } catch {
        symbol = currency;
    }

    return { symbol, maximumFD };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CategoryChip = memo(function CategoryChip({
    item,
    selected,
    onSelect,
}: {
    item: ItemCategory;
    selected: boolean;
    onSelect: (item: ItemCategory) => void;
}) {
    const handlePress = useCallback(() => onSelect(item), [onSelect, item]);
    return (
        <TouchableOpacity
            style={[styles.categoryChip, selected && styles.categoryChipSelected]}
            onPress={handlePress}
        >
            <View style={styles.categoryChipContent}>
                <MaterialCommunityIcons
                    name={selected ? 'check-circle' : 'checkbox-blank-circle-outline'}
                    size={16}
                    color={selected ? '#2E7D32' : '#9AA0A6'}
                />
                <Text
                    style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}
                    numberOfLines={1}
                >
                    {item.name}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export function ItemEditor({
    visible,
    initialValues,
    onClose,
    onSaved,
    maxCategories = 10,
    isSaving = false,
    expenseId,
}: ItemEditorProps) {
    // ─── Settings ─────────────────────────────────────────────────────────────
    const { data: defaultCurrency } = useGetByKeyQuery('default_currency');
    const { data: defaultLanguage } = useGetByKeyQuery('default_language');

    const { symbol: currencySymbol, maximumFD } = useMemo(() => {
        const locale = defaultLanguage?.value ?? 'en-US';
        const currency = defaultCurrency?.value ?? 'USD';
        return resolveCurrencyFormat(locale, currency);
    }, [defaultCurrency?.value, defaultLanguage?.value]);

    // ─── Category ─────────────────────────────────────────────────────────────
    const { data: fetchedCategories, isLoading: isCategoriesLoading } = useGetAllQuery();
    // FIX #7: no useMemo needed — fetchedCategories is already a stable reference from RTK Query
    const categories = fetchedCategories ?? [];

    // FIX #11: fixed typo Mudation → Mutation
    const [createCategory, { data: createdCategoryData }] = useCreateCategoryMutation();

    // ─── Item mutations ───────────────────────────────────────────────────────
    const [addItem] = useAddItemMutation();
    const [updateItem] = useUpdateItemMutation();

    // ─── Refs ─────────────────────────────────────────────────────────────────
    const itemNameRef = useRef<TextInput | null>(null);
    const editorScrollRef = useRef<ScrollView | null>(null);
    const inlineCategoryY = useRef(0);
    const shouldFocusNameRef = useRef(false);

    // ─── Local state ──────────────────────────────────────────────────────────
    const [addCategoryVisible, setAddCategoryVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // ─── Form ─────────────────────────────────────────────────────────────────
    const { handleSubmit, control, reset, setValue } = useForm<ItemEditorValues>({
        defaultValues: {
            id: undefined,
            name: '',
            price: '0',
            category: '',
        },
    });

    // FIX #8: single useWatch — derive everything from one subscription
    const [watchedName, watchedCategory] = useWatch({ control, name: ['name', 'category'] });
    const selectedCategory = watchedCategory || initialValues?.category || null;

    // ─── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        reset({
            id: initialValues?.id,
            name: initialValues?.name ?? '',
            price: initialValues?.price ?? '0',
            category: initialValues?.category ?? '',
        });
        // Don't auto-focus when editing an existing item — user may only want to change price/category.
        shouldFocusNameRef.current = !initialValues?.id;
    }, [initialValues, reset]);

    const focusNameInput = useCallback(() => {
        if (!shouldFocusNameRef.current) return;
        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                if (!shouldFocusNameRef.current) return;
                itemNameRef.current?.focus?.();
            }, 60);
        });
    }, []);

    useEffect(() => {
        if (!visible) return;
        focusNameInput();
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            Keyboard.dismiss();
            return true;
        });
        return () => sub.remove();
    }, [visible, focusNameInput, onClose]);

    useEffect(() => {
        if (!addCategoryVisible) return;
        setTimeout(() => {
            const targetY = inlineCategoryY.current > 0 ? Math.max(inlineCategoryY.current - 12, 0) : 0;
            editorScrollRef.current?.scrollTo({ y: targetY, animated: true });
        }, 120);
    }, [addCategoryVisible]);

    // FIX #1: added selectedCategory and setValue to deps — was a stale closure
    useEffect(() => {
        if ((!selectedCategory || categories.length <= 0) && createdCategoryData?.id) {
            setValue('category', createdCategoryData.id);
        }
    }, [createdCategoryData, selectedCategory, setValue]);

    // FIX #4 + #5: removed empty keyboardWillShow listener; keyboard hide listener
    // uses a ref for onClose/watchedName so it never needs to re-subscribe.
    const onCloseRef = useRef(onClose);
    const watchedNameRef = useRef(watchedName);
    const watchedCategoryRef = useRef(watchedCategory);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { watchedNameRef.current = watchedName; }, [watchedName]);
    useEffect(() => { watchedCategoryRef.current = watchedCategory; }, [watchedCategory]);

    useEffect(() => {
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const hideSub = Keyboard.addListener(hideEvent, () => {
            const name = watchedNameRef.current;
            const category = watchedCategoryRef.current;
            const noValues = (!name || name === '') && (!category || category === '');
            if (noValues) onCloseRef.current();
        });
        return () => hideSub.remove();
    // Intentionally empty deps — refs keep values fresh without re-subscribing
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleAddCategory = useCallback(() => {
        setNewCategoryName('');
        setAddCategoryVisible(true);
    }, []);

    const handleCancelCategory = useCallback(() => {
        setNewCategoryName('');
        setAddCategoryVisible(false);
    }, []);

    // FIX #2: await createCategory and surface errors
    const handleSaveCategory = useCallback(async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        if (categories.length >= maxCategories) {
            Alert.alert('Category limit reached', `You can only keep up to ${maxCategories} categories.`);
            return;
        }

        try {
            await createCategory({ name: trimmed });
            setNewCategoryName('');
            setAddCategoryVisible(false);
        } catch (error) {
            console.error('[ItemEditor] Failed to create category:', error);
            Alert.alert('Error', 'Failed to save category. Please try again.');
        }
    }, [newCategoryName, categories.length, maxCategories, createCategory]);

    // FIX #6: renderCategoryItem is the render function directly — no double wrapper
    const renderCategoryItem = useCallback(({ item }: { item: ItemCategory }) => (
        <CategoryChip
            item={item}
            selected={selectedCategory === item.id || selectedCategory === item.name}
            onSelect={(category) => setValue('category', category.id)}
        />
    ), [selectedCategory, setValue]);

    const categoryKeyExtractor = useCallback((item: ItemCategory) => item.id, []);

    // FIX #3, #10, #12, #14
    const onSavePress = handleSubmit(async (values) => {
        // FIX #12: respect isSaving to prevent double-submit
        if (isSaving) return;

        const priceNumber = typeof values.price === 'string' ? parseFloat(values.price) : values.price;
        if (Number.isNaN(priceNumber)) return;

        const now = Date.now();
        const basePayload = {
            name: values.name.trim(),
            price: priceNumber,
            category: values.category || '',
        };

        // FIX #14: reset focus ref BEFORE calling onSaved to avoid stale state
        // if onSaved triggers a re-render that remounts this component
        shouldFocusNameRef.current = false;

        try {
            let result: { data?: ItemRecord; error?: unknown };

            if (initialValues?.id) {
                result = await updateItem({
                    id: initialValues.id,
                    payload: {
                        ...basePayload,
                        latitude: null,
                        longitude: null,
                        place_name: null,
                        updated_at: now,
                    },
                });
            } else {
                const insertPayload: InsertPayload = {
                    expense_id: expenseId,
                    ...basePayload,
                    quantity: 1,
                    created_at: now,
                    updated_at: now,
                    deleted_at: null,
                    sync_status: 'pending',
                    latitude: null,
                    longitude: null,
                    place_name: null,
                };
                result = await addItem(insertPayload);
            }

            // FIX #3: check for RTK Query error shape before calling onSaved
            if ('error' in result && result.error) {
                console.error('[ItemEditor] Save failed:', result.error);
                Alert.alert('Error', 'Failed to save item. Please try again.');
                return;
            }

            if (result.data) {
                onSaved?.(result.data);
            }
        } catch (error) {
            console.error('[ItemEditor] Unexpected save error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        }
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!visible) return null;

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.editorContent}>
                <ScrollView
                    ref={editorScrollRef}
                    style={styles.modalScroll}
                    contentContainerStyle={[
                        styles.modalScrollContent,
                        { paddingBottom: Platform.OS === 'ios' ? 16 : 32 },
                    ]}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    bounces
                >
                    <Controller
                        control={control}
                        rules={{ required: true }}
                        name="name"
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
                    />

                    <View style={styles.priceRow}>
                        <Text style={styles.pricePrefix}>{currencySymbol}</Text>
                        <Controller
                            control={control}
                            rules={{ required: true }}
                            name="price"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <CurrencyInput
                                    value={typeof value === 'number' ? value : parseFloat(value as string)}
                                    onChangeValue={onChange}
                                    onBlur={onBlur}
                                    keyboardType="decimal-pad"
                                    prefix={undefined}
                                    delimiter="."
                                    separator=","
                                    precision={maximumFD}
                                    minValue={0}
                                    style={styles.priceInput}
                                    showPositiveSign={false}
                                />
                            )}
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
                            onLayout={(e) => { inlineCategoryY.current = e.nativeEvent.layout.y; }}
                        >
                            <TextInput
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                                placeholder="Category name"
                                style={styles.addCategoryInput}
                                autoFocus
                            />
                            <View style={styles.addCategoryActions}>
                                <TouchableOpacity
                                    style={[styles.secondaryButton, styles.modalActionButton, { flex: 1 }]}
                                    onPress={handleCancelCategory}
                                >
                                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.primaryButton, styles.modalActionButton, { flex: 1 }]}
                                    onPress={handleSaveCategory}
                                >
                                    <Text style={styles.primaryButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View>
                            {isCategoriesLoading ? (
                                <ActivityIndicator size="small" />
                            ) : (
                                <FlatList
                                    data={categories}
                                    keyExtractor={categoryKeyExtractor}
                                    renderItem={renderCategoryItem}
                                    extraData={selectedCategory}
                                    numColumns={CATEGORY_COLUMNS}
                                    scrollEnabled={false}
                                    columnWrapperStyle={styles.categoryRow}
                                    contentContainerStyle={styles.categoryListContent}
                                    keyboardShouldPersistTaps="handled"
                                />
                            )}
                        </View>
                    )}
                </ScrollView>

                {!addCategoryVisible && (
                    <View style={styles.modalFooterButtons}>
                        <TouchableOpacity onPress={onSavePress} disabled={isSaving}>
                            <View style={[styles.primaryButton, styles.modalActionButton, isSaving && styles.buttonDisabled]}>
                                <Text style={styles.primaryButtonText}>
                                    {isSaving ? 'Saving...' : 'Save Item'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    editorContent: {
        flex: 1,
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
        justifyContent: 'space-between',
        gap: 10,
    },
    inlineCategoryContainer: {
        gap: 10,
    },
    modalScroll: {
        padding: 16,
        paddingTop: 12,
    },
    modalScrollContent: {
        flexGrow: 1,
        gap: 16,
        paddingBottom: 16,
    },
    itemNameInput: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111',
        minHeight: 30,
        textAlignVertical: 'top',
        paddingRight: 0,
        paddingLeft: 0,
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
        fontSize: 28,
        fontWeight: '700',
        color: '#111',
        paddingVertical: 0,
    },
    categoryLabel: {
        fontSize: 16,
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
        gap: 8,
    },
    categoryRow: {
        gap: 6,
    },
    categoryChip: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F4F6FB',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    categoryChipContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 5,
    },
    categoryChipSelected: {
        backgroundColor: '#E4F5EB',
    },
    categoryChipText: {
        color: '#333',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    categoryChipTextSelected: {
        color: '#2E7D32',
        fontWeight: '700',
    },
    modalFooterButtons: {
        paddingHorizontal: 16,
    },
    modalActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
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
    buttonDisabled: {
        opacity: 0.7,
    },
});

export default ItemEditor;