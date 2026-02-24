import { UX_ZERO_DECIMAL } from "@/constants/settings";
import { ItemResponse, useUpdateItemMutation } from "@/redux/expense/expense-api";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Constants ───────────────────────────────────────────────────────────────

const FONTS = {
    regular: "Inter_400Regular",
    semiBold: "Inter_600SemiBold",
} as const;

const COLORS = {
    surface: "#FFFFFF",
    border: "#E5E5E5",
    primaryText: "#1A1A1A",
    secondaryText: "#666",
    mutedText: "gray",
} as const;

const SIZES = {
    cardRadius: 20,
    cardPadding: 16,
    rowGap: 0,
    buttonSize: 36,
    quantitySpacing: 16,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCurrencyFormatter(
    languageCode: string,
    currencyCode: string
): Intl.NumberFormat {
    const isZeroDecimal = UX_ZERO_DECIMAL.includes(currencyCode);
    const fractionDigits = isZeroDecimal
        ? 0
        : new Intl.NumberFormat(languageCode, {
              style: "currency",
              currency: currencyCode,
          }).resolvedOptions().maximumFractionDigits;

    return new Intl.NumberFormat(languageCode, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseItemProps {
    item: ItemResponse | null;
    currencyCode?: string;
    languageCode?: string;
    onRemove?: (item: ItemResponse) => void;
    onEdit?: (item: ItemResponse) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExpenseItem({
    item,
    currencyCode = "USD",
    languageCode = "en-US",
    onRemove,
    onEdit,
}: ExpenseItemProps) {
    const [updateItem] = useUpdateItemMutation();
    const [quantity, setQuantity] = useState(item?.quantity ?? 1);

    const formatter = useMemo(
        () => buildCurrencyFormatter(languageCode, currencyCode),
        [languageCode, currencyCode]
    );

    const handleDecrease = useCallback(() => {
        if (!item) return;
        setQuantity((prev) => {
            if (prev <= 1) return prev;
            const next = prev - 1;
            updateItem({ id: item.id, payload: { quantity: next } });
            return next;
        });
    }, [item, updateItem]);

    const handleIncrease = useCallback(() => {
        if (!item) return;
        setQuantity((prev) => {
            const next = prev + 1;
            updateItem({ id: item.id, payload: { quantity: next } });
            return next;
        });
    }, [item, updateItem]);

    const handleRemove = useCallback(() => {
        if (!item) return;
        Alert.alert(
            "Remove Item",
            "Are you sure you want to remove this item?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => onRemove?.(item),
                },
            ]
        );
    }, [item, onRemove]);

    const handleEdit = useCallback(() => {
        if (!item) return;
        onEdit?.(item);
    }, [item, onEdit]);

    if (!item) return null;

    const { name, category, category_name, price } = item;
    const formattedTotal = formatter.format(price * quantity);

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={styles.detailsContainer}>
                    <Text style={styles.name}>{name}</Text>
                    {category && (
                        <Text style={styles.category}>{category_name}</Text>
                    )}
                </View>
                <Text style={styles.price}>{formattedTotal}</Text>
            </View>

            <View style={styles.bottomRow}>
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        onPress={handleDecrease}
                        style={[styles.quantityButton, styles.decreaseButton]}
                        accessibilityLabel="Decrease quantity"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="minus" size={18} color="#666" />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{quantity}</Text>

                    <TouchableOpacity
                        onPress={handleIncrease}
                        style={[styles.quantityButton, styles.increaseButton]}
                        accessibilityLabel="Increase quantity"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        onPress={handleRemove}
                        style={styles.removeButton}
                        accessibilityLabel={`Remove ${name}`}
                        accessibilityRole="button"
                    >
                        <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleEdit}
                        style={styles.editButton}
                        accessibilityLabel={`Edit ${name}`}
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons
                            name="text-box-edit-outline"
                            size={20}
                            color="#666"
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FCFCFC",
        borderRadius: SIZES.cardRadius,
        padding: SIZES.cardPadding,
        borderWidth: 1,
        borderColor: COLORS.border,
        boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.075)',
    },
    topRow: {
        flexDirection: "row",
        marginBottom: SIZES.rowGap,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: "center",
    },
    name: {
        fontSize: 17,
        color: COLORS.primaryText,
        marginBottom: Platform.OS === "ios" ? 3 : 0,
        fontFamily: FONTS.semiBold,
    },
    category: {
        fontSize: 12,
        color: COLORS.mutedText,
        fontFamily: FONTS.semiBold,
    },
    price: {
        fontSize: 16,
        color: COLORS.primaryText,
        fontFamily: FONTS.semiBold,
        marginLeft: 8,
    },
    bottomRow: {
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    quantityButton: {
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        borderRadius: SIZES.buttonSize / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    decreaseButton: {
        backgroundColor: "lavenderblush",
    },
    increaseButton: {
        backgroundColor: "honeydew",
    },
    quantityText: {
        fontSize: 16,
        paddingHorizontal: SIZES.quantitySpacing,
        color: COLORS.primaryText,
        fontFamily: FONTS.regular,
    },
    actionButtons: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 12,
    },
    removeButton: {
        padding: 8,
        marginRight: 8,
    },
    removeButtonText: {
        fontSize: 12,
        color: COLORS.secondaryText,
        fontFamily: FONTS.semiBold,
    },
    editButton: {
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        borderRadius: SIZES.buttonSize / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: "ivory",
    },
});