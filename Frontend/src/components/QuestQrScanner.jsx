import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { Html5Qrcode } from 'html5-qrcode';
import { Check, QrCode, Scan } from 'lucide-react';

const getScanValue = (result) => (
    result?.ScanResult
    || result?.scanResult
    || result?.content
    || result?.text
    || ''
);

const QuestQrScanner = ({
    disabled = false,
    loading = false,
    buttonLabel = 'Quét QR',
    scannedLabel = 'Đã quét QR',
    onScan,
}) => {
    const scannerIdRef = useRef(`quest-qr-reader-${Math.random().toString(36).slice(2)}`);
    const scannerRef = useRef(null);
    const [webScannerOpen, setWebScannerOpen] = useState(false);
    const [error, setError] = useState('');
    const [scannedValue, setScannedValue] = useState('');
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        if (isNative || !webScannerOpen) return undefined;

        let html5QrCode = null;
        let mounted = true;

        const startScanner = async () => {
            try {
                // Small delay to ensure the DOM element is ready
                await new Promise((resolve) => setTimeout(resolve, 300));
                if (!mounted) return;

                html5QrCode = new Html5Qrcode(scannerIdRef.current);
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 240, height: 240 },
                    },
                    (decodedText) => {
                        if (!mounted) return;
                        const token = String(decodedText || '').trim();
                        setScannedValue(token);
                        setWebScannerOpen(false);
                        html5QrCode.stop().then(() => {
                            if (token) onScan?.(token);
                        }).catch(() => {
                            if (token) onScan?.(token);
                        });
                    },
                    (scanError) => {
                        // Ignore frame-by-frame errors (like QR not found)
                    }
                );
            } catch (err) {
                if (mounted) {
                    console.error("QR scanner start error:", err);
                    setError('Không mở được camera. Vui lòng cấp quyền camera để quét QR và đảm bảo sử dụng HTTPS.');
                }
            }
        };

        startScanner();

        return () => {
            mounted = false;
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch((err) => console.error("Error stopping scanner on unmount:", err));
            }
            scannerRef.current = null;
        };
    }, [isNative, onScan, webScannerOpen]);

    const handleScanClick = async () => {
        if (disabled || loading) return;
        setError('');

        if (!isNative) {
            setWebScannerOpen((current) => !current);
            return;
        }

        try {
            const result = await CapacitorBarcodeScanner.scanBarcode({
                hint: 17,
                scanInstructions: 'Hướng camera vào mã QR của doanh nghiệp',
                cameraDirection: 1,
            });
            const token = String(getScanValue(result)).trim();
            if (!token) return;
            setScannedValue(token);
            onScan?.(token);
        } catch (scanError) {
            const message = scanError?.message || '';
            if (!message.toLowerCase().includes('cancel')) {
                setError(message || 'Không quét được mã QR.');
            }
        }
    };

    return (
        <div className="quest-qr-scan-panel">
            <button
                type="button"
                className="quest-action-btn"
                onClick={handleScanClick}
                disabled={disabled || loading}
            >
                {loading ? 'Đang xác thực...' : <><Scan size={16} /> {buttonLabel}</>}
            </button>
            {scannedValue && (
                <div className="quest-qr-result">
                    <Check size={14} /> {scannedLabel}
                </div>
            )}
            {webScannerOpen && (
                <div className="quest-qr-reader-wrap">
                    <QrCode size={16} />
                    <div id={scannerIdRef.current} className="quest-qr-reader" />
                </div>
            )}
            {error && <div className="quest-qr-error">{error}</div>}
        </div>
    );
};

export default QuestQrScanner;
