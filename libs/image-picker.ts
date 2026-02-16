import * as ImagePicker from "expo-image-picker";
import { PermissionStatus } from "expo-image-picker";
import { Linking, Platform } from "react-native";

export type MediaPermissionState = PermissionStatus;

const SETTINGS_URL = Platform.select({ ios: "app-settings:", android: "app-settings:" });

const isGranted = (status: MediaPermissionState) => status === "granted";
const needsRequest = (status: MediaPermissionState) => status === "undetermined";

const openSystemSettings = async () => {
    if (!SETTINGS_URL) return false;
    const supported = await Linking.canOpenURL(SETTINGS_URL);
    if (!supported) return false;
    await Linking.openURL(SETTINGS_URL);
    return true;
};

export const getMediaLibraryPermissionStatus = async (): Promise<MediaPermissionState> => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return status;
};

export const requestMediaLibraryPermission = async (): Promise<MediaPermissionState> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status;
};

export const ensureMediaLibraryPermission = async (): Promise<{ granted: boolean; status: MediaPermissionState }> => {
    const currentStatus = await getMediaLibraryPermissionStatus();
    if (isGranted(currentStatus)) {
        return { granted: true, status: currentStatus };
    }

    if (needsRequest(currentStatus)) {
        const requested = await requestMediaLibraryPermission();
        return { granted: isGranted(requested), status: requested };
    }

    // Already denied/restricted; prompt settings and report failure
    await openSystemSettings();
    return { granted: false, status: currentStatus };
};
