import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

interface BarcodeScannerModalProps {
    onDetected: (barcode: string) => void;
    onClose: () => void;
}

// Тільки product-barcode формати — QR/DataMatrix часто URL/JSON, не GTIN.
const PRODUCT_FORMATS = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
];

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onDetected, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const detectedRef = useRef(false);
    const cancelledRef = useRef(false);
    // Тримаємо актуальний onDetected у ref, щоб ефект не перезапускав камеру,
    // коли батько передає нове замикання на кожен рендер.
    const onDetectedRef = useRef(onDetected);
    onDetectedRef.current = onDetected;

    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, PRODUCT_FORMATS);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);

        const stopVideoTracks = () => {
            // Підстраховка: якщо controls.stop() не зупинив трек (наприклад, ми
            // ще не отримали controls на момент unmount), глушимо вручну.
            const stream = videoRef.current?.srcObject as MediaStream | null;
            stream?.getTracks().forEach(t => t.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
        };

        const startScanner = async () => {
            try {
                const controls = await reader.decodeFromConstraints(
                    {
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            advanced: [{ focusMode: 'continuous' }]
                        },
                    },
                    videoRef.current!,
                    (result, err) => {
                        if (result && !detectedRef.current) {
                            detectedRef.current = true;
                            controlsRef.current?.stop();
                            stopVideoTracks();

                            // ZXing для EAN/UPC/CODE_128 повертає рядок з цифрами;
                            // підстраховуємось — лишаємо тільки цифри для бекенда.
                            const raw = result.getText().trim();
                            const digits = raw.replace(/\D+/g, '');
                            onDetectedRef.current(digits.length >= 6 ? digits : raw);
                        }
                        if (err && !(err instanceof NotFoundException)) {
                            // NotFoundException = "у цьому кадрі ще не знайшли" — нормально.
                            // Інше — справжня помилка декодеру; шумно для прод, ок для dev.
                            console.warn('Decode error:', err);
                        }
                    }
                );

                // Якщо користувач закрив модалку поки тривав await — одразу зупиняємо.
                if (cancelledRef.current) {
                    controls.stop();
                    stopVideoTracks();
                    return;
                }

                controlsRef.current = controls;
                setScanning(true);
            } catch (err: any) {
                console.error('Camera error:', err);
                stopVideoTracks();

                // Розрізняємо причини, бо UX дій різний:
                // - NotAllowedError → користувач натиснув "Заборонити" в браузері
                // - NotFoundError   → камери немає взагалі (десктоп без вебки)
                // - NotReadableError → інший застосунок зайняв камеру
                const name = err?.name as string | undefined;
                if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                    setError('Доступ до камери заборонено. Дозвольте камеру в налаштуваннях браузера й оновіть сторінку.');
                } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                    setError('Камеру не знайдено. Переконайтеся, що пристрій має камеру.');
                } else if (name === 'NotReadableError' || name === 'TrackStartError') {
                    setError('Камера зайнята іншим застосунком. Закрийте інші вкладки/програми, які її використовують.');
                } else {
                    setError('Не вдалося запустити камеру. Спробуйте ще раз або введіть штрих-код вручну.');
                }
            }
        };

        startScanner();

        return () => {
            cancelledRef.current = true;
            controlsRef.current?.stop();
            controlsRef.current = null;
            stopVideoTracks();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                        autoPlay
                    />

                    {scanning && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '280px', height: '120px',
                            border: '2px solid #3b82f6', borderRadius: '6px',
                            pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)'
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: 4, right: 4,
                                height: '2px',
                                backgroundColor: '#3b82f6',
                                animation: 'scanLine 1.5s ease-in-out infinite',
                                top: '50%',
                                opacity: 0.8,
                            }} />
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
                onClick={onClose}
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
