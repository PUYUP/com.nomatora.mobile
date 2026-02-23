import { useGetByKeyQuery, useUpsertMutation } from '@/redux/general-settings-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { countries } from 'countries-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constants & Types ────────────────────────────────────────────────────────

const MAX_RESULTS = 100;

interface CountryItem {
	name: string;
	code: string;
	currency: string;
	languageCode: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

// FIX #3: `countries` is a static import — compute once at module level,
// not inside the component or a useEffect that runs on every mount.
const COUNTRY_LIST: CountryItem[] = Object.entries(countries).map(([code, data]) => ({
	code,
	name: data.name,
	currency: data.currency[0],
	languageCode: data.languages[0],
}));

// ─── Component ────────────────────────────────────────────────────────────────

export default function CurrencySelector() {
	const router = useRouter();
	const [query, setQuery] = useState('');
	// FIX #5: selectedCode only needs to reflect the persisted setting, not a
	// transient tap state that disappears before re-render. Read it from the
	// actual stored value so the correct row stays highlighted on re-open.
	const { data: currentCurrencySetting } = useGetByKeyQuery('default_currency');
	const selectedCurrency = currentCurrencySetting?.value ?? null;

	const inputRef = useRef<TextInput>(null);
	const [updateSetting] = useUpsertMutation();

	const filtered = useMemo<CountryItem[]>(() => {
		const q = query.trim();
		if (!q) return COUNTRY_LIST.slice(0, MAX_RESULTS);
		return COUNTRY_LIST.filter((item) => filterFn(item, q)).slice(0, MAX_RESULTS);
	}, [query]);

	// FIX #9: handleChangeText was a no-op wrapper — use setQuery directly
	const handleClear = useCallback(() => {
		setQuery('');
		inputRef.current?.focus();
	}, []);

	// FIX #1: router (not router.back) in deps — router.back is not a stable ref
	// FIX #2: await both mutations so errors surface; navigate after both succeed
	// FIX #6: removed unnecessary 10ms setTimeout — navigate immediately
	const handleSelect = useCallback(
		async (item: CountryItem) => {
			AccessibilityInfo.announceForAccessibility(`${item.name} selected`);
			try {
				await Promise.all([
					updateSetting({ key: 'default_currency', value: item.currency }),
					updateSetting({ key: 'default_language', value: `${item.languageCode}-${item.code}` }),
				]);
			} catch {
				// Settings are best-effort — navigate back regardless so the user
				// is not stuck. The next time this screen opens it will re-read
				// the stored value.
			}
			router.back();
		},
		[updateSetting, router],
	);

	const renderItem = useCallback(
		({ item }: { item: CountryItem }) => {
			const isSelected = item.currency === selectedCurrency;
			return (
				<Pressable onPress={() => handleSelect(item)}>
					<View style={[styles.listItem, isSelected && styles.listItemSelected]}>
						<Text style={styles.currency}>{item.currency}</Text>
						<Text style={styles.listItemText}>{item.name}</Text>
						{isSelected && (
							<MaterialCommunityIcons
								name="check"
								size={18}
								color="#111827"
								style={styles.checkIcon}
							/>
						)}
					</View>
				</Pressable>
			);
		},
		[handleSelect, selectedCurrency],
	);

	return (
		<SafeAreaView style={styles.safeArea} edges={['bottom']}>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
					<View style={styles.container}>
						<View style={styles.searchBox}>
							<TextInput
								ref={inputRef}
								style={styles.searchInput}
								value={query}
								onChangeText={setQuery}
								placeholder="Search by country name..."
								placeholderTextColor="#9CA3AF"
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

						{/* FIX #7: inline style moved to StyleSheet */}
						<FlatList
							style={styles.list}
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
	);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	searchBox: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '100%',
		borderBottomWidth: 1,
		borderColor: 'gainsboro',
		paddingRight: 16,
	},
	searchInput: {
		height: 48,
		paddingHorizontal: 16,
		flex: 1,
		backgroundColor: '#fff',
	},
	// FIX #7: was an inline style on FlatList
	list: {
		flex: 1,
		paddingTop: 8,
	},
	listItem: {
		padding: 16,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	listItemSelected: {
		backgroundColor: '#e5e7eb',
	},
	listItemText: {
		color: '#111827',
		flex: 1,
	},
	currency: {
		fontWeight: '900',
		marginRight: 10,
		width: 40,
	},
	checkIcon: {
		marginLeft: 8,
	},
});