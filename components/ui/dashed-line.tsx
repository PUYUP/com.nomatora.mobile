import { View } from 'react-native';

// Horizontal
export function DashedLine({ 
    color = 'rgba(255,255,255,0.3)',
    dashWidth = 6,
    dashHeight = 1.5,
    gap = 4,
}: {
    color?: string;
    dashWidth?: number;
    dashHeight?: number;
    gap?: number;
}) {
    const dashes = Array.from({ length: 40 });
    return (
        <View style={{ flexDirection: 'row', overflow: 'hidden', alignItems: 'center' }}>
            {dashes.map((_, i) => (
                <View key={i} style={{
                    width: dashWidth,
                    height: dashHeight,
                    backgroundColor: color,
                    marginRight: gap,
                }} />
            ))}
        </View>
    );
}

// Vertical
export function DashedLineVertical({
    color = 'rgba(255,255,255,0.3)',
    dashWidth = 1.5,
    dashHeight = 6,
    gap = 4,
}: {
    color?: string;
    dashWidth?: number;
    dashHeight?: number;
    gap?: number;
}) {
    const dashes = Array.from({ length: 40 });
    return (
        <View style={{ flexDirection: 'column', overflow: 'hidden', alignItems: 'center' }}>
            {dashes.map((_, i) => (
                <View key={i} style={{
                    width: dashWidth,
                    height: dashHeight,
                    backgroundColor: color,
                    marginBottom: gap,
                }} />
            ))}
        </View>
    );
}