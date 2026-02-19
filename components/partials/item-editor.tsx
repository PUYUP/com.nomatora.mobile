import { UX_ZERO_DECIMAL } from "@/constants/settings";
import { expenseItems } from "@/database/schema/expense-item";
import { itemCategories } from "@/database/schema/expense-item-category";
import { useCreateMutation as createCategoryMudation, useGetAllQuery } from "@/redux/expense/category-api";
import { useAddItemMutation } from "@/redux/expense/expense-api";
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

const CATEGORY_COLUMNS = 2;

export type ItemCategory = typeof itemCategories.$inferSelect;
export type ItemRecord = typeof expenseItems.$inferSelect;

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

const CategoryChip = memo(function CategoryChip({
    item,
    selected,
    onSelect,
}: {
    item: ItemCategory;
    selected: boolean;
    onSelect: (item: ItemCategory) => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.categoryChip, selected && styles.categoryChipSelected]}
            onPress={() => onSelect(item)}
        >
            <View style={styles.categoryChipContent}>
                <MaterialCommunityIcons
                    name={selected ? "check-circle" : "checkbox-blank-circle-outline"}
                    size={16}
                    color={selected ? "#2E7D32" : "#9AA0A6"}
                />
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{item.name}</Text>
            </View>
        </TouchableOpacity>
    );
});

export function ItemEditor({
    visible,
    initialValues,
    onClose,
    onSaved,
    maxCategories = 10,
    isSaving = false,
    expenseId,
}: ItemEditorProps) {
    // currency and language settings
    const [maximumFD, setMaximumFD] = useState(2);
    const [currencySymbol, setCurrencySymbol] = useState<string>('$');
    const { data: defaultCurrency } = useGetByKeyQuery('default_currency');
    const { data: defaultLanguage } = useGetByKeyQuery('default_language');

    // category
    const { data: fetchedCategories, isLoading: isCategoriesLoading } = useGetAllQuery();
    const [createCategory, { data: createdCategoryData }] = createCategoryMudation();
    const categories = useMemo(() => fetchedCategories?.map((c) => c) ?? [], [fetchedCategories]);

    // item
    const [addItem] = useAddItemMutation();

    /**
     * Get currency symbol from settings and pass to ItemEditor for price formatting. This is a temporary solution until we implement a proper global state management for settings.
     */
    useEffect(() => {
        // Fallback to USD / en-US when settings are unavailable
        const locale = defaultLanguage?.value ?? 'en-US';
        const currency = defaultCurrency?.value ?? 'USD';

        const formatter = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
        });

        // 1️⃣ Fraction Digits
        const resolvedFD = formatter.resolvedOptions().maximumFractionDigits;

        const maximumFractionDigits =
            UX_ZERO_DECIMAL.includes(currency)
            ? 0
            : resolvedFD ?? 2;

        setMaximumFD(maximumFractionDigits);

        // 2️⃣ Currency Symbol
        let symbol = currency; // safer fallback

        try {
            if (typeof formatter.formatToParts === "function") {
                const parts = formatter.formatToParts(0);
                symbol =  parts.find(p => p.type === "currency")?.value ?? symbol;
            } else {
                const formatted = formatter.format(0);
                symbol = formatted.replace(/[\d\s.,-]/g, "") || symbol;
            }
        } catch {
            symbol = currency;
        }

        setCurrencySymbol(symbol);
    }, [defaultCurrency?.value, defaultLanguage?.value]);

    const itemNameRef = useRef<TextInput | null>(null);
    const editorScrollRef = useRef<ScrollView | null>(null);
    const inlineCategoryY = useRef(0);
    const shouldFocusNameRef = useRef(false);

    const [addCategoryVisible, setAddCategoryVisible] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const { handleSubmit, control, reset, setValue, getValues } = useForm<ItemEditorValues>({
        defaultValues: {
            id: undefined,
            name: "",
            price: "",
            category: "",
        },
    });
    const itemValues = useWatch({ control: control, name: ['name', 'price', 'category'] });
    const selectedCategory = useWatch({ control, name: "category" }) || initialValues?.category || null;

    useEffect(() => {
        reset({
            id: initialValues?.id,
            name: initialValues?.name ?? "",
            price: initialValues?.price ?? "",
            category: initialValues?.category ?? "",
        });
        shouldFocusNameRef.current = true;
    }, [initialValues, reset]);

    const focusNameInput = useCallback(() => {
        if (!shouldFocusNameRef.current) return;
        InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
                if (!shouldFocusNameRef.current) return;
                const node = itemNameRef.current;
                node?.focus?.();
            }, 60);
        });
    }, []);

    useEffect(() => {
        if (!visible) return;
        focusNameInput();
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
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

    useEffect(() => {
        /**
         * Only auto-select category when:
         * - Not editing existing item
         * - AND there is no selected category yet
         */
        if (!selectedCategory && createdCategoryData) {
            setValue('category', createdCategoryData?.id ?? '');
        }
    }, [createdCategoryData]);

    const categoryKeyExtractor = useCallback((item: ItemCategory) => item.id, []);
    const renderCategoryItem = useCallback(({ item }: { item: ItemCategory }) => {
        return (
            <CategoryChip
                item={item}
                selected={selectedCategory ? selectedCategory === item.id || selectedCategory === item.name : false}
                onSelect={(category) => setValue("category", category.id)}
            />
        );
    }, [selectedCategory, setValue]);

    const handleAddCategory = () => {
        setNewCategoryName("");
        setAddCategoryVisible(true);
    };

    const handleCancelCategory = () => {
        setNewCategoryName("");
        setAddCategoryVisible(false);
    };

    const saveCategoryHandler = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;

        if (categories && categories.length >= maxCategories) {
            Alert.alert("Category limit reached", `You can only keep up to ${maxCategories} categories.`);
            return;
        }

        createCategory({ name: trimmed });
        setNewCategoryName("");
        setAddCategoryVisible(false);
    };

    const onSavePress = handleSubmit(async (values) => {
        const priceNumber = typeof values.price === "string" ? parseFloat(values.price) : values.price;
        if (Number.isNaN(priceNumber)) return;

        const now = Date.now();
        const payload: Omit<typeof expenseItems.$inferInsert, 'id'> = {
            expense_id: expenseId,
            name: values.name.trim(),
            price: priceNumber,
            category: values.category || '',
            quantity: 1,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            sync_status: 'pending',
            latitude: null,
            longitude: null,
            place_name: null,
        }

        const result = await addItem(payload);
        if (result && result.data) {
            onSaved?.(result.data as ItemRecord);
        }
        shouldFocusNameRef.current = false;
    });

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
                // do something
            }
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
                const noValues = itemValues.every((value) => !value || value === '');
                if (noValues) {
                    onClose();
                }
            }
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [itemValues]);

    if (!visible) return null;

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.editorContent}> 
                <ScrollView
                    ref={editorScrollRef}
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollContent}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    bounces={true}
                    overScrollMode="never"
                >
                    <Controller
                        control={control}
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
                        <Text style={styles.pricePrefix}>{currencySymbol}</Text>
                        <Controller
                            control={control}
                            rules={{ required: true }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <CurrencyInput
                                    value={typeof value === "number" ? value : parseFloat(value) || 0}
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
                                <TouchableOpacity style={[styles.primaryButton, styles.modalActionButton]} onPress={saveCategoryHandler}>
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
                                    renderItem={({ item }) => renderCategoryItem({ item })}
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
                        <TouchableOpacity
                            onPress={onSavePress}
                            disabled={isSaving}
                        >
                            <View style={[styles.primaryButton, styles.modalActionButton, isSaving && { opacity: 0.7 }]}>
                                <Text style={styles.primaryButtonText}>{isSaving ? "Saving..." : "Save Item"}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    editorContent: {
        flex: 1,
    },
    addCategoryInput: {
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: "#111",
        backgroundColor: "#F8F8F8",
    },
    addCategoryActions: {
        flexDirection: "row",
        gap: 10,
    },
    inlineCategoryContainer: {
        gap: 10,
    },
    modalScroll: {
        padding: 16,
    },
    modalScrollContent: {
        flexGrow: 1,
        gap: 16,
        paddingBottom: 16,
    },
    itemNameInput: {
        fontSize: 24,
        fontWeight: "600",
        color: "#111",
        minHeight: 40,
        textAlignVertical: "top",
        paddingRight: 52,
        paddingLeft: 0,
    },
    priceLabel: {
        fontSize: 14,
        color: "#555",
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderBottomWidth: 1,
        borderColor: "#E0E0E0",
        paddingBottom: 8,
    },
    pricePrefix: {
        fontSize: 24,
        color: "#444",
    },
    priceInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: "700",
        color: "#111",
        paddingVertical: 0,
    },
    categoryLabel: {
        fontSize: 14,
        color: "#555",
    },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    categoryAddButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: "#EFEFFF",
        borderColor: "#D0D0FF",
    },
    categoryAddText: {
        fontSize: 13,
        fontWeight: "600",
    },
    categoryListContent: {
        gap: 10,
    },
    categoryRow: {
        gap: 10,
    },
    categoryChip: {
        flexDirection: "row",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#F4F6FB",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    categoryChipContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
    },
    categoryChipSelected: {
        backgroundColor: "#E4F5EB",
    },
    categoryChipText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "500",
        flex: 1,
    },
    categoryChipTextSelected: {
        color: "#2E7D32",
        fontWeight: "700",
    },
    modalFooterButtons: {
        paddingHorizontal: 16,
        minHeight: 48,
    },
    modalActionButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
    },
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
    secondaryButton: {
        backgroundColor: "#F4F4F4",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    secondaryButtonText: {
        color: "#333",
        fontSize: 15,
        fontWeight: "500",
    },
});

export default ItemEditor;
