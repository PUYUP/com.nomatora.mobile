import { useGetByKeyQuery, useUpsertMutation } from '@/redux/general-settings-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { countries } from 'countries-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface CountryItem {
  name: string;
  code: string;
  currency: string;
  languageCode: string;
}

const maxResults = 100;
const normalize = (str?: string): string => {
  if (!str) return '';
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const filterFn = (item: CountryItem, query: string): boolean => {
  const q = normalize(query);
  return (
    normalize(item.name).includes(q) ||
    normalize(item.code).includes(q) ||
    normalize(item.currency).includes(q)
  );
};

export default function CurrencySelector() {
    const router = useRouter();
    const [countryList, setCountryList] = useState<CountryItem[]>([]);
    const [query, setQuery] = useState<string>('');
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const inputRef = useRef<TextInput>(null);
    const [updateSetting] = useUpsertMutation();
    const { data: currentCurrencySetting } = useGetByKeyQuery('default_currency');

    const filtered = useMemo<CountryItem[]>(() => {
        const q = query.trim();
        if (!q) return countryList.slice(0, maxResults);
        return countryList.filter((item) => filterFn(item, q)).slice(0, maxResults);
    }, [query, countryList]);

    const handleChangeText = useCallback((text: string) => {
        setQuery(text);
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
    }, []);

    const handleSelect = useCallback(
        (item: CountryItem) => {
            setSelectedCode(item.code);
            AccessibilityInfo.announceForAccessibility(`${item.name} selected`);
            updateSetting({ key: 'default_currency', value: item.currency });
            updateSetting({ key: 'default_language', value: `${item.languageCode}-${item.code}` });
            
            setTimeout(() => {
                router.back();
            }, 10);
        },
        [updateSetting, router.back],
    );

    useEffect(() => {
        // For demonstration, we log the lists to the console.
        const countriesData = Object.entries(countries).map(([code, data]) => ({
            code,
            name: data.name,
            currency: data.currency[0],
            languageCode: data.languages[0],
        }));

        setCountryList(countriesData);
    }, []);

    const renderItem = useCallback(({ item }: { item: CountryItem }) => (
        <Pressable onPress={() => handleSelect(item)}>
            <View style={[styles.listItem, selectedCode === item.code && styles.listItemSelected]}>
                <Text style={styles.currency}>{item.currency}</Text>
                <Text style={styles.listItemText}>{item.name}</Text>
            </View>
        </Pressable>
    ), [handleSelect, selectedCode]);
    
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.container}>
                        <View style={styles.searchBox}>
                            <TextInput
                                ref={inputRef}
                                style={[styles.searchInput]}
                                value={query}
                                onChangeText={handleChangeText}
                                placeholder={'Search by country name...'}
                                placeholderTextColor="#9CA3AF"
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => {
                                    // slight delay so item tap is registered before hiding
                                    setTimeout(() => setIsFocused(false), 150);
                                }}
                                returnKeyType="search"
                                clearButtonMode="never"
                                autoCorrect={false}
                                autoCapitalize="none"
                                accessibilityLabel="Search input"
                                accessibilityHint="Type to filter the list"
                            />

                            {query.length > 0 && (
                                <TouchableOpacity
                                    onPress={handleClear}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Clear search"
                                >
                                    <MaterialCommunityIcons name="close-circle" size={26} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <FlatList
                            style={{ flex: 1, paddingHorizontal: 12 }}
                            data={filtered}
                            keyExtractor={(item) => item.code}
                            renderItem={renderItem}
                            keyboardShouldPersistTaps="handled"
                            accessibilityLabel="Currency list"
                            accessibilityHint="Browse and select a currency"
                        />
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    searchBox: {
        alignItems: 'center',
        paddingHorizontal: 12,
        flexDirection: 'row',
        width: '100%',
    },
    listItem: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    listItemSelected: {
        backgroundColor: '#e5e7eb',
    },
    listItemText: {
        color: '#111827',
    },
    searchInput: {
        height: 46,
        borderColor: 'gainsboro',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        margin: 10,
        flex: 1,
        backgroundColor: '#fff',
    },
    currency: {
        fontWeight: '900',
        marginRight: 10,
        width: 40,
    },
});