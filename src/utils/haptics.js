import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const hapticLight = async () => {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
};

export const hapticMedium = async () => {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
};

export const hapticHeavy = async () => {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }
};
