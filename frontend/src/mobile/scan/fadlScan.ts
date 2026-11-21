// fadl: own copy of the native scanner bootstrap (src/mobile/scan/html5Qrcode.ts)
// with a square decode region and a caller-chosen aspect ratio, so the fixed
// top panel never grows with the camera's native aspect.
import { t } from 'fyo';

/** The scanner library the Frappe framework serves for its desk scanner. */
const SCRIPT_URL =
  '/assets/frappe/node_modules/html5-qrcode/html5-qrcode.min.js';

/** Retail and shelf codes; fewer formats decode faster. */
const FORMATS = [
  'QR_CODE',
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
  'CODE_39',
  'CODE_93',
  'CODABAR',
  'ITF',
] as const;

type Box = { width: number; height: number };

// fadl: native Html5Qrcode shape plus the aspectRatio the library accepts
// but the native interface omits.
export interface Html5Qrcode {
  isScanning: boolean;
  start(
    camera: { facingMode: 'environment' },
    config: {
      fps: number;
      aspectRatio?: number;
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => Box;
      videoConstraints: MediaTrackConstraints;
    },
    onScan: (code: string) => void,
    onFrameWithoutCode: () => void
  ): Promise<void>;
  stop(): Promise<void>;
  clear(): void;
}

interface Html5QrcodeLibrary {
  Html5Qrcode: new (
    elementId: string,
    config: {
      verbose: boolean;
      formatsToSupport: number[];
      experimentalFeatures: { useBarCodeDetectorIfSupported: boolean };
    }
  ) => Html5Qrcode;
  Html5QrcodeSupportedFormats: Record<(typeof FORMATS)[number], number>;
}

let loading: Promise<Html5QrcodeLibrary> | undefined;

function loadLibrary(): Promise<Html5QrcodeLibrary> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.onload = () => resolve(window as unknown as Html5QrcodeLibrary);
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error(t`Could not load the barcode scanner.`));
    };
    document.head.append(script);
  });

  return loading;
}

/**
 * Starts the rear camera in the element and reports EVERY code it reads.
 * The library crops each frame to qrbox before decoding (both ZXing and
 * BarcodeDetector paths), so the rectangle below is the real scan region
 * and the library's corner shaders mark its edges truthfully. It hugs the
 * fixed panel frame: wide like a barcode, short like the panel.
 */
export async function startFadlScanner(
  elementId: string,
  onScan: (code: string) => void,
  aspectRatio: number,
  onFrameWithoutCode: () => void,
  regionHeight: number
): Promise<Html5Qrcode> {
  const library = await loadLibrary();
  const scanner = new library.Html5Qrcode(elementId, {
    verbose: false,
    formatsToSupport: FORMATS.map(
      (format) => library.Html5QrcodeSupportedFormats[format]
    ),
    // Android Chrome's own detector is faster; iOS falls back to the library.
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  });

  await scanner.start(
    { facingMode: 'environment' },
    {
      fps: 10,
      // fadl: ask the camera for the panel's aspect so filling the fixed box
      // distorts as little as possible; the crop math stays exact either way.
      aspectRatio,
      // fadl: a wide rectangle hugging the visible panel band. The overlay's
      // sizer keeps the video at natural aspect, so the client height here
      // is the sizer's; clamp to the panel height the user actually sees.
      qrbox: (width: number, height: number): Box => ({
        width: Math.floor(width * 0.9),
        height: Math.floor(Math.min(height, regionHeight) * 0.9),
      }),
      // iOS gives 640x480 unless asked, too coarse for thin bars.
      videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: aspectRatio },
      },
    },
    onScan,
    onFrameWithoutCode
  );

  return scanner;
}
