import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ScanExpense() {
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView>
                <View>
                    <Text>Scan Expense</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}