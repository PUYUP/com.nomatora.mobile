import { JourneyStats } from '@/components/partials/journey-stats';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JourneyStatsModal() {
	return (
		<SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
			<View style={{ paddingTop: 16 }}>
                <JourneyStats />
            </View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
	},
});