import DeviceInfo from 'react-native-device-info';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  cachedDeviceId = await DeviceInfo.getUniqueId();
  return cachedDeviceId;
}

export async function getDeviceFingerprint(): Promise<string> {
  const [id, brand, model, os, version] = await Promise.all([
    DeviceInfo.getUniqueId(),
    Promise.resolve(DeviceInfo.getBrand()),
    Promise.resolve(DeviceInfo.getModel()),
    Promise.resolve(DeviceInfo.getSystemName()),
    Promise.resolve(DeviceInfo.getSystemVersion()),
  ]);
  return `${brand}|${model}|${os}|${version}|${id}`;
}
