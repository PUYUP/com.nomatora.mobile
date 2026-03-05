import { TrackingPayload, useCreateMutation } from '@/redux/tracking/tracking-api';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EdgeInsets, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Tracks keyboard height in a worklet-compatible shared value.
 * The animated height respects the bottom safe-area inset so content
 * never slides up too far on devices with a home indicator.
 */
function useKeyboardOffset(insets: EdgeInsets) {
    const height = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: (event) => {
                "worklet";
                height.value = withTiming(Math.max(event.height, insets.bottom), { duration: 0 });
            },
        },
        [],
    );

    return height;
}

export default function JourneyEditor() {
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardOffset(insets);
    const keyboardSpacerStyle = useAnimatedStyle(() => ({
        height: Math.max(0, keyboardHeight.value - insets.bottom),
    }));

    // ─── Queryset ─────────────────────────────────────────────────────────────
    const [createTrackingSession, { isLoading, isSuccess, isError }] = useCreateMutation();

    // ─── State ────────────────────────────────────────────────────────────────
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    // ─── Form ─────────────────────────────────────────────────────────────────
    const { handleSubmit, control, reset, setValue } = useForm<Omit<TrackingPayload, 'id'>>({
        defaultValues: {
            name: '',
            visibility: 'public',
            started_at: Date.now(), // default can be overridden on save if needed
        },
    });

    const handleConfirm = (date: Date) => {
        setValue('started_at', date.getTime());
        hideDatePicker();
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    const saveHandler = handleSubmit(async (values) => {
        const payload: Omit<TrackingPayload, 'id'> = {
            name: values.name,
            visibility: values.visibility,
            started_at: values.started_at,
            mode: null, // mode can be set later when tracking starts
            user_id: 'current-user-id', // replace with actual user ID from auth context
        };

        try {
            const result = await createTrackingSession(payload).unwrap();
            console.log('Tracking session created:', result);
            reset(); // reset form to default values after successful creation
        } catch (error) {
            console.error('Failed to create tracking session:', error);
        }
    });

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.content}>
                    <Controller
                        control={control}
                        rules={{ required: true }}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={{ paddingHorizontal: 20, width: '100%' }}>
                                <TextInput
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    placeholder="Trip name"
                                    multiline
                                    style={styles.nameInput}
                                />
                            </View>
                        )}
                    />

                    <Controller
                        control={control}
                        rules={{ required: true }}
                        name="visibility"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View style={styles.switchRow}>
                                <Text style={{ flex: 1, fontSize: 16 }}>Private</Text>
                                <Switch
                                    trackColor={{false: '#767577', true: '#ffd700'}}
                                    thumbColor={value === 'private' ? '#fafad2' : '#f4f3f4'}
                                    onValueChange={(val) => onChange(val ? 'private' : 'public')}
                                    value={value === 'private'}
                                />
                            </View>
                        )}
                    />

                    <View style={styles.startedAtRow}>
                        <Text style={{ flex: 1, fontSize: 16 }}>Started at</Text>
                        <TouchableOpacity style={styles.datePickerButton} onPress={() => setDatePickerVisibility(true)}>
                            <MaterialCommunityIcons name="calendar-edit" size={20} color="#2f4f4f" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#2f4f4f' }}>{format(new Date(control._formValues.started_at), 'dd MMM yyyy')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={saveHandler} 
                        disabled={isLoading}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                <Animated.View style={keyboardSpacerStyle} />

                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirm}
                    onCancel={hideDatePicker}
                />
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingTop: 20,
    },
    footer: {
        height: 'auto',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    saveButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#ffd700',
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    nameInput: {
        width: '100%',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'left',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingHorizontal: 20,
    },
    startedAtRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 2,
        borderWidth: 0.5,
        borderColor: '#2f4f4f',
        borderRadius: 25,
    },
});