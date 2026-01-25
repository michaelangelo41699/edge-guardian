import { NativeModules, Platform } from 'react-native';

const { GuardianModule } = NativeModules;

// TypeScript Interface to keep things safe
interface GuardianInterface {
  startMonitoring(): void;
  stopMonitoring(): void;
}

// Fallback for when we run on iOS or Web (so the app doesn't crash)
const Guardian: GuardianInterface = GuardianModule || {
  startMonitoring: () => console.warn('GuardianModule not available on this platform'),
  stopMonitoring: () => console.warn('GuardianModule not available on this platform'),
};

export const startGuardian = () => {
  console.log("🛡️ Starting Guardian Service...");
  Guardian.startMonitoring();
};

export const stopGuardian = () => {
  console.log("🛑 Stopping Guardian Service...");
  Guardian.stopMonitoring();
};
