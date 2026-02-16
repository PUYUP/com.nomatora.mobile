import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeStackHeaderBackProps } from '@react-navigation/native-stack';
import { useNavigation } from 'expo-router';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HeaderBackButton(props: NativeStackHeaderBackProps) {
    const navigation = useNavigation();

    if (!props.canGoBack) {
        return null;
    }

    return (
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.headerBackTileStyle}>
                <MaterialCommunityIcons name="keyboard-backspace" size={26} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    headerBackTileStyle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        backgroundColor: '#FFFFFF',
        marginHorizontal: Platform.OS === 'ios' ? 0 : 16,
        marginLeft: 0,
    },
});