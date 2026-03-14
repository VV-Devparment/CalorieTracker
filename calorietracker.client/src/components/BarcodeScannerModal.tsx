import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

const SCANNER_DIV_ID = 'barcode-scanner-view';

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onDetected, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const detectedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const scanner = new Html5Qrcode(SCANNER_DIV_ID);
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 280, height: 120 } },
            (decodedText) => {
                if (detectedRef.current) return;
                detectedRef.current = true;
                scanner.stop()
                    .catch(() => {})
                    .finally(() => onDetected(decodedText));
            },
            undefined
        ).catch((err) => {
            setError('Не вдалося отримати доступ до камери. Переконайтеся, що ви дозволили доступ.');
            console.error('Camera error:', err);
        });

        return () => {
            scanner.stop().catch(() => {});
        };
    }, []);

    const handleClose = () => {
        scannerRef.current?.stop().catch(() => {});
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
                    {/* Scanner container */}
                    <div
                        id={SCANNER_DIV_ID}
                        style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}
                    />
                    {/* Targeting overlay */}
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '280px', height: '120px',
                        border: '2px solid #3b82f6', borderRadius: '6px',
                        pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)'
                    }}>
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
                </div>
            )}

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
