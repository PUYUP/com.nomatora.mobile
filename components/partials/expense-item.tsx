import { ExpenseItemData } from "@/redux/expense/slice";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch } from "react-redux";

const FONTS = {
    regular: 'Inter_400Regular',
    semiBold: 'Inter_600SemiBold',
};

const COLORS = {
    surface: '#FFFFFF',
    border: '#E5E5E5',
    primaryText: '#1A1A1A',
    secondaryText: '#666',
    mutedText: 'gray',
};

const SIZES = {
    cardRadius: 20,
    cardPadding: 16,
    rowGap: 12,
    buttonSize: 36,
    quantitySpacing: 16,
};

interface ExpenseItemProps {
    item: ExpenseItemData;
    onRemove?: (id: string) => void;
    onEdit?: (id: string) => void;
}

export default function ExpenseItem({ item, onRemove, onEdit }: ExpenseItemProps) {
    if (!item) return null;
    
    const { id, name, category, price } = item;
    const dispatch = useDispatch();
    const [quantity, setQuantity] = useState(item.quantity ?? 1);
    const displayPrice = parseFloat(price ?? '0');
    const totalPrice = displayPrice * quantity;

    const handleDecrease = (id: string) => {
        setQuantity((prev) => {
            const newQuantity = prev > 1 ? prev - 1 : prev;
            dispatch({ type: 'expense/updateItem', payload: { ...item, quantity: newQuantity } });
            return newQuantity;
        });
    };

    const handleIncrease = (id: string) => {
        setQuantity((prev) => {
            const newQuantity = prev + 1;
            dispatch({ type: 'expense/updateItem', payload: { ...item, quantity: newQuantity } });
            return newQuantity;
        });
    };

    const handleRemove = (id: string) => {
        Alert.alert(
            "Remove Item",
            "Are you sure you want to remove this item?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    onPress: () => {
                        dispatch({ type: 'expense/removeItem', payload: id });
                    },
                    style: "destructive"
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={styles.detailsContainer}>
                    <Text style={styles.name}>{name}</Text>
                    {category && <Text style={styles.category}>{category}</Text>}
                </View>

                <Text style={styles.price}>${totalPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.bottomRow}>
                <View style={styles.quantityContainer}>
                    <TouchableOpacity onPress={() => handleDecrease(id)} style={styles.quantityButton}>
                        <MaterialCommunityIcons name="minus" size={18} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity onPress={() => handleIncrease(id)} style={styles.quantityButton}>
                        <MaterialCommunityIcons name="plus" size={18} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => handleRemove(id)} style={styles.removeButton}>
                        <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onEdit?.(id)} style={styles.editButton}>
                        <MaterialCommunityIcons name="text-box-edit-outline" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.cardRadius,
        padding: SIZES.cardPadding,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    topRow: {
        flexDirection: 'row',
        marginBottom: SIZES.rowGap,
    },
    detailsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        color: COLORS.primaryText,
        marginBottom: 4,
        fontFamily: FONTS.regular,
    },
    category: {
        fontSize: 12,
        color: COLORS.mutedText,
        fontFamily: FONTS.semiBold,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.secondaryText,
        fontFamily: FONTS.regular,
    },
    price: {
        fontSize: 16,
        color: COLORS.primaryText,
        fontFamily: FONTS.semiBold,
        marginLeft: 8,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityButton: {
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        borderRadius: SIZES.buttonSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    quantityText: {
        fontSize: 16,
        paddingHorizontal: SIZES.quantitySpacing,
        color: COLORS.primaryText,
        fontFamily: FONTS.regular,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    editButton: {
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        borderRadius: SIZES.buttonSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
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
});