import { StyleSheet, Text, View } from 'react-native';

const SIGNAL_COLORS = {
  bad: '#ff3b30',
  orange: '#ff9500',
  medium: '#ffd60a',
  good: '#30d158',
  inactive: '#d1d5db',
} as const

function signalLevelToDbmRange(level: number): { min: number, max: number } {
    const MIN_DBM = -120;
    const MAX_DBM = -50;
    const LEVELS = 5;
    const clamped = Math.min(Math.max(level, 0), LEVELS - 1);
    const step = (MAX_DBM - MIN_DBM) / LEVELS;
    const min = Math.round(MIN_DBM + step * clamped);
    const max = Math.round(MIN_DBM + step * (clamped + 1));

    return { min: min, max: max };
}

const clampStrength = (value: number) => Math.min(Math.max(value, 0), 4);
const getSignalColor = (strength: number) => {
    switch (strength) {
        case 0:
            return SIGNAL_COLORS.bad;
        case 1:
            return SIGNAL_COLORS.orange;
        case 2:
            return SIGNAL_COLORS.medium;
        case 3:
        case 4:
        default:
            return SIGNAL_COLORS.good;
    }
};

export function SignalBar({ rawStrength }: { rawStrength: number }) {
    const strengthLevel = Number.isFinite(rawStrength) ? clampStrength(rawStrength) : null;
    const strengthRange = signalLevelToDbmRange(strengthLevel ?? 0);
    const strengthColor = strengthLevel === null ? SIGNAL_COLORS.inactive : getSignalColor(strengthLevel);

    return (
        <View style={styles.container}>
            <View style={styles.signalGraph}>
                {[24, 24, 24, 24, 24].map((height, index) => {
                    const isActive = strengthLevel !== null && strengthLevel > 0 && index < strengthLevel;
                    const barColor = isActive ? strengthColor : SIGNAL_COLORS.inactive;

                    return (
                        <View
                            key={`bar-${index}`}
                            style={[styles.signalBar, { height, backgroundColor: barColor }]}
                        />
                    )
                })}
            </View>

            <View style={styles.strengthCol}>
                <View style={styles.strengthRow}>
                    <Text style={styles.strengthText}>
                        {strengthRange.min}
                    </Text>
                    <Text style={styles.strengthText}>...</Text>
                    <Text style={styles.strengthText}>
                        {strengthRange.max}
                    </Text>
                    <Text style={[styles.strengthText, { fontWeight: 'normal' }]}>dBm</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
    },
    signalGraph: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
    },
    signalBar: {
        width: 7,
        borderRadius: 4,
    },
    strengthCol: {
        marginTop: 1,
    },
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    strengthText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});