import { Platform } from 'react-native';

/**
 * Check if the device supports native UIGlassEffect (iOS 26+).
 * Returns false on Android and older iOS versions.
 */
export function isNativeLiquidGlassAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const version = parseInt(Platform.Version as string, 10);
  return version >= 26;
}

/**
 * Check if the platform is Android.
 */
export function isAndroid(): boolean {
  return Platform.OS === 'android';
}
