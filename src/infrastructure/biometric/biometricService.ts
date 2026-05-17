import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rn = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export interface BiometricAvailability {
  available: boolean;
  biometryType: 'FaceID' | 'TouchID' | 'Biometrics' | null;
}

export const biometricService = {
  async isAvailable(): Promise<BiometricAvailability> {
    try {
      const { available, biometryType } = await rn.isSensorAvailable();
      let type: BiometricAvailability['biometryType'] = null;
      if (biometryType === BiometryTypes.FaceID) type = 'FaceID';
      else if (biometryType === BiometryTypes.TouchID) type = 'TouchID';
      else if (biometryType === BiometryTypes.Biometrics) type = 'Biometrics';
      return { available, biometryType: type };
    } catch {
      return { available: false, biometryType: null };
    }
  },

  /** Prompt biometric. Returns success flag — caller handles fail/cancel. */
  async prompt(reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { success, error } = await rn.simplePrompt({
        promptMessage: reason,
        cancelButtonText: 'Batal',
      });
      return { success, error };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Biometric error' };
    }
  },

  /** Human-readable biometric type label dalam Bahasa Indonesia */
  labelFor(type: BiometricAvailability['biometryType']): string {
    if (type === 'FaceID') return 'Wajah';
    if (type === 'TouchID') return 'Sidik Jari';
    if (type === 'Biometrics') return 'Sidik Jari';
    return 'Biometrik';
  },
};
