import { expenseItems } from "@/database/schema/expense-item";
import { ensureMediaLibraryPermission, openSystemSettings } from "@/libs/image-picker";
import { supabase } from "@/libs/supabase";
import { useAddItemsMutation, useGetDraftedExpenseQuery } from "@/redux/expense/expense-api";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import TextRecognition, { TextBlock } from "@react-native-ml-kit/text-recognition";
import { CameraView } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAN_LINE_HEIGHT = 2;
const WINDOW_HEIGHT = Dimensions.get("window").height;
const SCAN_LOOP_DURATION_MS = 1400;

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpenseItemPayload = Omit<typeof expenseItems.$inferSelect, "id">;

interface ParsedReceiptItem {
    name: string;
    price: string;
    quantity?: number;
}

interface ParsedReceipt {
    result: {
        items: ParsedReceiptItem[];
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchReceiptFromBlocks(blocks: TextBlock[]): Promise<ParsedReceipt | null> {
    const { data, error } = await supabase.functions.invoke("receipt-extractor-gpt4", {
        body: { blocks: JSON.stringify(blocks) },
    });

    if (error) {
        console.warn("[ScanExpense] GPT parsing failed:", error);
        return null;
    }

    return data as ParsedReceipt;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useScanAnimation(isActive: boolean) {
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isActive) {
            scanAnim.stopAnimation();
            scanAnim.setValue(0);
            return;
        }

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: SCAN_LOOP_DURATION_MS,
                    useNativeDriver: true,
                }),
                Animated.timing(scanAnim, {
                    toValue: 0,
                    duration: SCAN_LOOP_DURATION_MS,
                    useNativeDriver: true,
                }),
            ])
        );

        loop.start();
        return () => loop.stop();
    }, [isActive, scanAnim]);

    return scanAnim;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ScanOverlayProps {
    scanAnim: Animated.Value;
    scanAreaHeight: number;
}

function ScanOverlay({ scanAnim, scanAreaHeight }: ScanOverlayProps) {
    return (
        <View style={styles.scanOverlay} pointerEvents="none">
            <Animated.View
                style={[
                    styles.scanLine,
                    {
                        transform: [
                            {
                                translateY: scanAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, scanAreaHeight - SCAN_LINE_HEIGHT],
                                }),
                            },
                        ],
                    },
                ]}
            />
        </View>
    );
}

interface CameraControlsProps {
    torchOn: boolean;
    isCapturing: boolean;
    onToggleTorch: () => void;
    onCapture: () => void;
    onGalleryPick: () => void;
    paddingBottom: number;
}

function CameraControls({
    torchOn,
    isCapturing,
    onToggleTorch,
    onCapture,
    onGalleryPick,
    paddingBottom,
}: CameraControlsProps) {
    return (
        <View style={[styles.controlsBar, { paddingBottom }]}>
            <View style={styles.controlButtonWrapper}>
                <TouchableOpacity style={styles.controlButton} onPress={onToggleTorch} accessibilityLabel={torchOn ? "Turn off torch" : "Turn on torch"}>
                    <MaterialCommunityIcons
                        name={torchOn ? "flashlight" : "flashlight-off"}
                        size={22}
                        color="#111"
                    />
                    <Text style={styles.controlLabel}>{torchOn ? "Torch On" : "Torch Off"}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.captureWrapper}>
                <TouchableOpacity
                    style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                    onPress={onCapture}
                    disabled={isCapturing}
                    accessibilityLabel="Capture receipt"
                >
                    {isCapturing ? (
                        <ActivityIndicator color="lightcoral" />
                    ) : (
                        <MaterialCommunityIcons name="circle-slice-8" size={30} color="linen" />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.controlButtonWrapper}>
                <TouchableOpacity style={styles.controlButton} onPress={onGalleryPick} accessibilityLabel="Pick from gallery">
                    <MaterialCommunityIcons name="image-multiple" size={22} color="#111" />
                    <Text style={styles.controlLabel}>Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface RecognitionFooterProps {
    isProcessing: boolean;
    recognizedText: string;
    onRetake: () => void;
}

function RecognitionFooter({ isProcessing, recognizedText, onRetake }: RecognitionFooterProps) {
    return (
        <View style={styles.recognitionFooter}>
            {isProcessing ? (
                <ActivityIndicator color="#0a0" />
            ) : (
                <Text style={styles.recognitionText} numberOfLines={3}>
                    {recognizedText || "No text detected"}
                </Text>
            )}
            <TouchableOpacity style={styles.secondaryButton} onPress={onRetake} accessibilityLabel="Retake photo">
                <Text style={styles.secondaryButtonLabel}>Retake</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
    const [recognizedText, setRecognizedText] = useState("");

    const scanAreaHeight = WINDOW_HEIGHT - insets.top - insets.bottom;
    const scanAnim = useScanAnimation(isProcessing && !!capturedUri);

    // Reset state on unmount
    useEffect(() => {
        return () => {
            setIsProcessing(false);
            setCapturedUri(null);
            setRecognizedText("");
        };
    }, []);

    const buildItemPayload = useCallback(
        (item: ParsedReceiptItem): ExpenseItemPayload => {
            const now = Date.now();
            return {
                expense_id: draftedExpense?.id ?? "temp-expense-id",
                name: item.name.trim(),
                price: parseFloat(item.price),
                category: "",
                quantity: item.quantity ?? 1,
                created_at: now,
                updated_at: now,
                deleted_at: null,
                sync_status: "pending",
                latitude: draftedExpense?.latitude
                    ? parseFloat(draftedExpense.latitude.toString())
                    : 0,
                longitude: draftedExpense?.longitude
                    ? parseFloat(draftedExpense.longitude.toString())
                    : 0,
                place_name: draftedExpense?.place_name ?? null,
            };
        },
        [draftedExpense]
    );

    const processImageUri = useCallback(
        async (uri: string) => {
            setIsProcessing(true);
            try {
                const recognitionResult = await TextRecognition.recognize(uri);
                const receipt = await fetchReceiptFromBlocks(recognitionResult.blocks);

                if (!receipt?.result?.items?.length) {
                    Alert.alert("No items found", "Could not extract any items from this receipt. Please try again.");
                    return;
                }

                const items = receipt.result.items.map(buildItemPayload);
                await addItems({ items });
                router.push("/expenses/submit");
            } catch (err) {
                console.warn("[ScanExpense] Text recognition failed:", err);
                Alert.alert("Processing Failed", "Something went wrong while reading the receipt. Please try again.");
                setRecognizedText("");
            } finally {
                setIsProcessing(false);
            }
        },
        [addItems, buildItemPayload, router]
    );

    const handleCapture = useCallback(async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.6,
                skipProcessing: true,
            });

            const uri = photo?.uri;
            if (!uri) throw new Error("No URI returned from camera.");

            setCapturedUri(uri);
            setTorchOn(false);
            setRecognizedText("");
            processImageUri(uri);
        } catch (err) {
            console.warn("[ScanExpense] Capture failed:", err);
            Alert.alert("Capture Failed", "Unable to take a photo. Please try again.");
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, processImageUri]);

    const handleGalleryPick = useCallback(async () => {
        const { granted } = await ensureMediaLibraryPermission();
        if (!granted) {
            Alert.alert(
                "Permission Required",
                "Media library access is required to select a photo. Please enable it in settings.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: openSystemSettings },
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

            if (result.canceled || !result.assets.length) return;

            const uri = result.assets[0].uri;
            setCapturedUri(uri);
            setRecognizedText("");
            processImageUri(uri);
        } catch (err) {
            console.warn("[ScanExpense] Gallery pick failed:", err);
            Alert.alert("Gallery Error", "Unable to open gallery. Please try again.");
        } finally {
            setIsCapturing(false);
        }
    }, [processImageUri]);

    const handleToggleTorch = useCallback(() => {
        setTorchOn((prev) => !prev);
    }, []);

    const handleRetake = useCallback(() => {
        setCapturedUri(null);
        setRecognizedText("");
    }, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
            <Stack.Screen
                options={{
                    headerTitle: "Scan your receipt",
                    headerTransparent: true,
                    headerTintColor: "#FFF",
                    headerRight: () => (
                        <View style={styles.headerHint}>
                            <Text style={styles.headerHintText}>
                                Align the receipt inside the camera and capture
                            </Text>
                        </View>
                    ),
                }}
            />

            <View style={styles.container}>
                {capturedUri ? (
                    <View style={styles.previewContainer}>
                        <Image
                            source={{ uri: capturedUri }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                        {isProcessing && (
                            <ScanOverlay scanAnim={scanAnim} scanAreaHeight={scanAreaHeight} />
                        )}
                    </View>
                ) : (
                    <CameraView
                        ref={(ref) => {
                            cameraRef.current = ref;
                        }}
                        style={styles.camera}
                        facing="back"
                        enableTorch={torchOn}
                    />
                )}

                {!capturedUri && (
                    <CameraControls
                        torchOn={torchOn}
                        isCapturing={isCapturing}
                        onToggleTorch={handleToggleTorch}
                        onCapture={handleCapture}
                        onGalleryPick={handleGalleryPick}
                        paddingBottom={insets.bottom}
                    />
                )}

                {capturedUri && (
                    <RecognitionFooter
                        isProcessing={isProcessing}
                        recognizedText={recognizedText}
                        onRetake={handleRetake}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "transparent",
    },
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    camera: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    previewContainer: {
        flex: 1,
        width: "100%",
        height: "100%",
        overflow: "hidden",
    },
    previewImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    headerHint: {
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 12,
        height: 38,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerHintText: {
        color: "#FFF",
        fontSize: 13,
    },
    // Camera controls
    controlsBar: {
        position: "absolute",
        bottom: 18,
        left: 20,
        right: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },
    controlButtonWrapper: {
        width: 120,
    },
    controlButton: {
        minWidth: 96,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.9)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    controlLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111",
    },
    captureWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "orangered",
        borderWidth: 2,
        borderColor: "lightcoral",
    },
    captureButtonDisabled: {
        opacity: 0.6,
    },
    // Recognition footer
    recognitionFooter: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "rgba(0,0,0,0.35)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    recognitionText: {
        flex: 1,
        color: "#FFF",
        fontSize: 13,
        fontWeight: "600",
    },
    secondaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FFF",
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    secondaryButtonLabel: {
        color: "#FFF",
        fontSize: 13,
        fontWeight: "700",
    },
    // Scan overlay
    scanOverlay: {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.1)",
    },
    scanLine: {
        height: SCAN_LINE_HEIGHT,
        backgroundColor: "#22c55e",
        shadowColor: "#22c55e",
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
});