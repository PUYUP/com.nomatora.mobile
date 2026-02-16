import { Camera, PermissionResponse } from "expo-camera";
import { Linking, Platform } from "react-native";

export type CameraPermissionState = PermissionResponse["status"];

const SETTINGS_URL = Platform.select({ ios: "app-settings:" });

const isGranted = (status: CameraPermissionState) => status === "granted";
const needsRequest = (status: CameraPermissionState) => status === "undetermined";

export const openCameraSettings = async () => { 
    try { 
        // Prefer the built-in helper; on Android this uses ACTION_APPLICATION_DETAILS_SETTINGS. 
        await Linking.openSettings(); 
        return true; 
    } catch (err) { 
        // fall through to platform URL below 
    } 
 
    if (SETTINGS_URL) { 
        const supported = await Linking.canOpenURL(SETTINGS_URL); 
        if (supported) { 
            await Linking.openURL(SETTINGS_URL); 
            return true; 
        } 
    } 
 
    return false; 
};

export const getCameraPermissionStatus = async (): Promise<CameraPermissionState> => {
    const { status } = await Camera.getCameraPermissionsAsync();
    return status;
};

export const requestCameraPermission = async (): Promise<CameraPermissionState> => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status;
};

export const ensureCameraPermission = async (): Promise<{ granted: boolean; status: CameraPermissionState }> => {
    const currentStatus = await getCameraPermissionStatus();
    if (isGranted(currentStatus)) {
        return { granted: true, status: currentStatus };
    }

    if (needsRequest(currentStatus)) {
        const requested = await requestCameraPermission();
        return { granted: isGranted(requested), status: requested };
    }

    return { granted: false, status: currentStatus };
};
