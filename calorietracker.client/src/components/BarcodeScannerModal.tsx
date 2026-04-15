import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

interface BarcodeScannerModalProps {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onDetected, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const readerRef = useRef<BrowserMultiFormatReader | null>(null);
    const detectedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.ITF,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        let controls: Awaited<ReturnType<typeof reader.decodeFromConstraints>> | null = null;

        const startScanner = async () => {
            try {
                controls = await reader.decodeFromConstraints(
                    {
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                    },
                    videoRef.current!,
                    (result, err) => {
                        if (result && !detectedRef.current) {
                            detectedRef.current = true;
                            controls?.stop();
                            onDetected(result.getText());
                        }
                        if (err && !(err instanceof NotFoundException)) {
                            console.warn('Decode error:', err);
                        }
                    }
                );
                setScanning(true);
            } catch (err) {
                console.error('Camera error:', err);
                setError('Не вдалося отримати доступ до камери. Переконайтеся, що ви дозволили доступ.');
            }
        };

        startScanner();

        return () => {
            controls?.stop();
        };
    }, []);

    const handleClose = () => {
        readerRef.current; // keep ref alive until controls.stop() in cleanup
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '20px'
        }}>
            <div style={{ color: 'white', fontSize: '17px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
                Скануйте штрих-код
            </div>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
                Наведіть камеру на штрих-код продукту
            </div>

            {error ? (
                <div style={{
                    backgroundColor: '#fef2f2', color: '#dc2626', padding: '16px 20px',
                    borderRadius: '8px', fontSize: '14px', textAlign: 'center', maxWidth: '360px'
                }}>
                    {error}
                </div>
            ) : (
                <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                    {/* Video stream */}
                    <video
                        ref={videoRef}
                        style={{
                            width: '100%',
                            borderRadius: '12px',
                            display: 'block',
                            backgroundColor: '#000',
                            minHeight: '240px',
                        }}
                        muted
                        playsInline
                    />

                    {/* Targeting overlay */}
                    {scanning && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '280px', height: '120px',
                            border: '2px solid #3b82f6', borderRadius: '6px',
                            pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)'
                        }}>
                            {/* Scanning line animation */}
                            <div style={{
                                position: 'absolute',
                                left: 4, right: 4,
                                height: '2px',
                                backgroundColor: '#3b82f6',
                                animation: 'scanLine 1.5s ease-in-out infinite',
                                top: '50%',
                                opacity: 0.8,
                            }} />
                            {/* Corner accents */}
                            {[
                                { top: -2, left: -2, borderTop: '4px solid #60a5fa', borderLeft: '4px solid #60a5fa' },
                                { top: -2, right: -2, borderTop: '4px solid #60a5fa', borderRight: '4px solid #60a5fa' },
                                { bottom: -2, left: -2, borderBottom: '4px solid #60a5fa', borderLeft: '4px solid #60a5fa' },
                                { bottom: -2, right: -2, borderBottom: '4px solid #60a5fa', borderRight: '4px solid #60a5fa' },
                            ].map((s, i) => (
                                <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes scanLine {
                    0%   { top: 10%; }
                    50%  { top: 85%; }
                    100% { top: 10%; }
                }
            `}</style>

            <button
                onClick={handleClose}
                style={{
                    marginTop: '28px', padding: '12px 40px',
                    backgroundColor: '#374151', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '15px',
                    cursor: 'pointer', fontWeight: '600'
                }}
            >
                Скасувати
            </button>
        </div>
    );
};

export default BarcodeScannerModal;
