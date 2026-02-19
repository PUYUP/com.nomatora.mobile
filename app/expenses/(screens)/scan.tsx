import { expenseItems } from "@/database/schema/expense-item";
import { ensureMediaLibraryPermission, openSystemSettings } from "@/libs/image-picker";
import { supabase } from "@/libs/supabase";
import { useAddItemsMutation, useGetDraftedExpenseQuery } from "@/redux/expense/expense-api";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import TextRecognition, { TextBlock } from "@react-native-ml-kit/text-recognition";
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const SCAN_LINE_HEIGHT = 2;
const windowHeight = Dimensions.get('window').height;

export default function ScanExpense() {
    const cameraRef = useRef<CameraView | null>(null);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    
    const { data: draftedExpense } = useGetDraftedExpenseQuery();
    const [addItems] = useAddItemsMutation();
    const [torchOn, setTorchOn] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedUri, setCapturedUri] = useState<string | null>(null);
    const [recognizedText, setRecognizedText] = useState<string>("");
    const scanAnim = useRef(new Animated.Value(0)).current;

    const handleToggleFlash = useCallback(() => {
        setTorchOn((prev) => !prev);
    }, []);

    const handleRecognizeText = useCallback(async (uri: string) => {
        setIsProcessing(true);
        try {
            const result = await TextRecognition.recognize(uri);
            const receipt = await generateReceiptFromBlocks(result.blocks);
            let totalLoop = 0;
            let items: Omit<typeof expenseItems.$inferSelect, 'id'>[] = [];

            // set to state for now, will use directly to prefill submit form later
            if (receipt) {
                for (let value of receipt.result.items) {
                    const now = Date.now();
                    const trimmedName = value.name.trim();
                    const payload: Omit<typeof expenseItems.$inferSelect, 'id'> = {
                        expense_id: draftedExpense?.id ?? 'temp-expense-id',
                        name: trimmedName,
                        price: parseFloat(value.price),
                        category: '',
                        quantity: value.quantity ? value.quantity : 1,
                        created_at: now,
                        updated_at: now,
                        deleted_at: null,
                        sync_status: 'pending',
                        latitude: draftedExpense?.latitude ? parseFloat(draftedExpense.latitude.toString()) : 0,
                        longitude: draftedExpense?.longitude ? parseFloat(draftedExpense.longitude.toString()) : 0,
                        place_name: draftedExpense?.place_name ?? null,
                    }

                    items.push(payload);
                    totalLoop++;
                }

                if (items.length > 0) {
                    await addItems({ items });
                }

                // back to submit page after processing, can consider to show confirmation dialog if needed
                if (totalLoop === receipt.result.items.length) {
                    router.push('/expenses/submit');
                }
            }
        } catch (err) {
            console.warn("Text recognition failed", err);
            setRecognizedText("");
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;
        setIsCapturing(true);
        try {
            const result = await cameraRef.current.takePictureAsync({ 
                quality: 0.6, 
                skipProcessing: true 
            });
            console.log("Captured photo:", result?.uri);
            const uri = result?.uri;
            if (uri) {
                setCapturedUri(uri);
                setTorchOn(false);
                setRecognizedText("");
                handleRecognizeText(uri);
            }
        } catch (err) {
            console.warn("Capture failed", err);
        } finally {
            setIsCapturing(false);
        }
    }, [handleRecognizeText, isCapturing]);

    /**
     * Pick image from gallery, for users who prefer to select existing receipt photo instead of taking new one
     * Note: this is a temporary solution, we can consider to build a custom gallery picker with cropping feature in the future
     */
    const handleGalleryPick = async () => {
        const { granted, status } = await ensureMediaLibraryPermission();
        if (!granted) {
            Alert.alert(
                "Permission Required",
                "Media library access is required to select a photo. Please enable it in settings.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: () => openSystemSettings() },
                ]
            );
            return;
        }

        setIsCapturing(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.6,
                allowsEditing: false,
                allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setCapturedUri(uri);
                setRecognizedText("");
                handleRecognizeText(uri);
            }
        } catch (err) {
            console.warn("Gallery pick failed", err);
        } finally {
            setIsCapturing(false);
        }
    };

    /**
     * Block result from scanner need to refine with AI
     * for now use GPT to extract correct value
     */
    const generateReceiptFromBlocks = async (blocks: TextBlock[]) => {
        const { data, error } = await supabase.functions.invoke("receipt-extractor-gpt4", {
            body: { blocks: JSON.stringify(blocks) },
        });

        if (error) {
            console.warn("GPT parsing failed", error);
            return null;
        }

        return data;
    }

    useEffect(() => {
        return () => {
            scanAnim.stopAnimation();
            setIsProcessing(false);
            setCapturedUri(null);
            setRecognizedText('');
        };
    }, [scanAnim]);

    useEffect(() => {
        if (!isProcessing || !capturedUri) {
            scanAnim.stopAnimation();
            scanAnim.setValue(0);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: 1400,
                    useNativeDriver: true,
                }),
                Animated.timing(scanAnim, {
                    toValue: 0,
                    duration: 1400,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [capturedUri, isProcessing, scanAnim]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['left', 'right']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Scan your receipt',
                    headerTransparent: true,
                    headerTintColor: '#FFF',
                    headerRight: () => (
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, height: 38, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontSize: 13 }}>Align the receipt inside the camera and capture</Text>
                        </View>
                    ),
                }}
            />
            
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {capturedUri ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
                        {isProcessing ? (
                            <View style={styles.scanOverlay} pointerEvents="none">
                                <Animated.View
                                    style={[
                                        styles.scanLine,
                                        {
                                            transform: [
                                                {
                                                    translateY: scanAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, (windowHeight - insets.top - insets.bottom) - SCAN_LINE_HEIGHT],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />
                            </View>
                                    ) : null}
                    </View>
                ) : (
                    <CameraView
                        ref={(ref) => { cameraRef.current = ref; }}
                        style={styles.camera}
                        facing="back"
                        enableTorch={torchOn}
                    />
                )}

                {!capturedUri && (
                    <View style={[styles.controlsBar, { paddingBottom: insets.bottom }]}>
                        <View style={{ width: 120 }}> 
                            <TouchableOpacity style={styles.controlButton} onPress={handleToggleFlash}>
                                <MaterialCommunityIcons name={torchOn ? "flashlight" : "flashlight-off"} size={22} color="#111" />
                                <Text style={styles.controlLabel}>{torchOn ? "Torch On" : "Torch Off"}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <TouchableOpacity style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]} onPress={handleCapture} disabled={isCapturing}>
                                {isCapturing ? (
                                    <ActivityIndicator color="lightcoral" />
                                ) : (
                                    <MaterialCommunityIcons name="circle-slice-8" size={30} color="linen" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={{ width: 120 }}>
                            <TouchableOpacity style={styles.controlButton} onPress={handleGalleryPick}>
                                <MaterialCommunityIcons name="image-multiple" size={22} color="#111" />
                                <Text style={styles.controlLabel}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {capturedUri ? (
                    <View style={styles.recognitionFooter}>
                        {isProcessing ? (
                            <ActivityIndicator color="#0a0" />
                        ) : (
                            <Text style={styles.recognitionText} numberOfLines={3}>
                                {recognizedText || "No text detected"}
                            </Text>
                        )}
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => { setCapturedUri(null); setRecognizedText(""); }}>
                            <Text style={styles.secondaryButtonLabel}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    camera: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    previewContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    previewImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    controlsBar: {
        position: 'absolute',
        bottom: 18,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    controlButton: {
        minWidth: 96,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    controlLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111',
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'orangered',
        borderWidth: 2,
        borderColor: 'lightcoral',
    },
    captureButtonDisabled: {
        opacity: 0.6,
    },
    recognitionFooter: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    recognitionText: {
        flex: 1,
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFF',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    secondaryButtonLabel: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    scanOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    scanLine: {
        height: SCAN_LINE_HEIGHT,
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
});