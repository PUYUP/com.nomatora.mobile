import { Text, View } from "react-native";
import { LatLng } from "react-native-maps";

const GeojsonMarker = ({ coordinate }: { coordinate: LatLng }) => {
    console.log('and coordinate:', coordinate);
    return (
        <View style={{
            backgroundColor: 'blue',
            padding: 8,
            borderRadius: 20
        }}>
            <Text style={{ color: 'white' }}>{coordinate ? `${coordinate.latitude}, ${coordinate.longitude}` : ''}</Text>
        </View>
    );
};

export default GeojsonMarker;