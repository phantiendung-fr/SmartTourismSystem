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
    const scanLockedRef = useRef(false);
    const onScanRef = useRef(onScan);
    const [webScannerOpen, setWebScannerOpen] = useState(false);
    const [error, setError] = useState('');
    const [scannedValue, setScannedValue] = useState('');
    const isNative = Capacitor.isNativePlatform();

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        if (isNative || !webScannerOpen) return undefined;

        let mounted = true;
        scanLockedRef.current = false;
        const scanner = new Html5Qrcode(scannerIdRef.current, { verbose: false });
        scannerRef.current = scanner;

        const stopScanner = async () => {
            try {
                if (scanner.isScanning) {
                    await scanner.stop();
                }
            } catch (_) {
                // Camera may already be stopped.
            }

            try {
                scanner.clear();
            } catch (_) {
                // Ignore cleanup errors from html5-qrcode internals.
            }
        };

        scanner.start(
            { facingMode: { ideal: 'environment' } },
            {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const size = Math.floor(Math.max(170, Math.min(minEdge * 0.74, 240)));
                    return { width: size, height: size };
                },
                disableFlip: false,
            },
            async (decodedText) => {
                if (!mounted || scanLockedRef.current) return;
                const token = String(decodedText || '').trim();
                if (!token) return;

                scanLockedRef.current = true;
                setScannedValue(token);
                setWebScannerOpen(false);
                await stopScanner();
                onScanRef.current?.(token);
            },
            (scanError) => {
                if (!mounted || !scanError) return;
                const message = String(scanError);
                if (
                    message.includes('NotAllowedError')
                    || message.includes('Permission')
                    || message.includes('NotFoundError')
                ) {
                    setError('Không mở được camera. Vui lòng cấp quyền camera để quét QR.');
                }
            }
        ).then(() => {
            if (!mounted) {
                stopScanner();
            }
        }).catch(() => {
            if (mounted) {
                setError('Không mở được camera. Vui lòng cấp quyền camera để quét QR.');
            }
        });

        return () => {
            mounted = false;
            stopScanner();
            scannerRef.current = null;
        };
    }, [isNative, webScannerOpen]);

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
                    <div className="quest-qr-camera-shell">
                        <div id={scannerIdRef.current} className="quest-qr-reader">
                            <div className="quest-qr-reader-placeholder">Đang mở camera...</div>
                        </div>
                        <div className="quest-qr-scan-frame" aria-hidden="true">
                            <span />
                            <small>Đưa mã QR vào khung quét</small>
                        </div>
                    </div>
                </div>
            )}
            {error && <div className="quest-qr-error">{error}</div>}
        </div>
    );
};

export default QuestQrScanner;
