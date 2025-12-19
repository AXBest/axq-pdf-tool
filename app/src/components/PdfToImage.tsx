import { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { FileUp, FileImage, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PdfToImageProps {
    isActive: boolean;
}

export default function PdfToImage({ isActive }: PdfToImageProps) {
    const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        const unlisten = listen('tauri://drag-drop', (event: any) => {
            if (!isActive) return;
            const droppedFiles = event.payload.paths as string[];
            const pdfFiles = droppedFiles.filter(p => p.toLowerCase().endsWith('.pdf'));

            if (pdfFiles.length > 0) {
                setSelectedFile(pdfFiles[0]);
                setStatus({ type: null, message: '' });
            }
            setIsDragOver(false);
        });

        const unlistenEnter = listen('tauri://drag-enter', () => {
            if (isActive) setIsDragOver(true);
        });
        const unlistenLeave = listen('tauri://drag-leave', () => {
            if (isActive) setIsDragOver(false);
        });

        return () => {
            unlisten.then(f => f());
            unlistenEnter.then(f => f());
            unlistenLeave.then(f => f());
        };
    }, [isActive]);

    const handleFileSelect = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'PDF',
                    extensions: ['pdf']
                }]
            });

            if (selected) {
                setSelectedFile(selected as string);
                setStatus({ type: null, message: '' });
            }
        } catch (error) {
            console.error('File selection error:', error);
        }
    };

    const handleConvert = async () => {
        if (!selectedFile) return;

        try {
            setIsProcessing(true);
            setStatus({ type: null, message: '' });

            const outputDir = await open({
                directory: true,
                multiple: false,
                title: t('pdfToImage.selectOutput')
            });

            if (!outputDir) {
                setIsProcessing(false);
                return;
            }

            await invoke('pdf_to_image', {
                input: selectedFile,
                output: outputDir
            });

            setStatus({
                type: 'success',
                message: t('pdfToImage.successMsg', { path: outputDir })
            });
        } catch (error) {
            console.error(error);
            setStatus({
                type: 'error',
                message: String(error)
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isActive) return null;

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
            <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${isDragOver ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
                    <FileImage className="w-5 h-5 text-indigo-600" />
                    {t('pdfToImage.title')}
                </h2>

                <div className="space-y-4">
                    {/* File Drop Zone */}
                    <div
                        onClick={handleFileSelect}
                        className={`
                            group border-2 border-dashed rounded-lg p-16   
                            text-center cursor-pointer transition-all duration-200
                            ${isDragOver
                                ? 'border-indigo-500 bg-indigo-50'
                                : selectedFile
                                    ? 'border-indigo-200 bg-indigo-50/30'
                                    : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center space-y-2">
                            <div className={`p-3 rounded-full ${isDragOver || selectedFile ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                {selectedFile ? <FileImage className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                            </div>
                            <p className={`text-sm font-medium ${selectedFile ? 'text-indigo-900' : 'text-slate-600'}`}>
                                {selectedFile ? selectedFile.split('\\').pop()?.split('/').pop() : t('common.selectFile')}
                            </p>
                            <p className="text-xs text-slate-400">
                                {selectedFile ? t('common.clickToChange') : t('common.dragDrop')}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleConvert}
                        disabled={!selectedFile || isProcessing}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {t('common.processing')}
                            </>
                        ) : (
                            t('pdfToImage.action')
                        )}
                    </button>
                </div>
            </div>

            {status.type === 'error' && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {status.message}
                </div>
            )}

            {status.type === 'success' && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {status.message}
                </div>
            )}
        </div>
    );
}
