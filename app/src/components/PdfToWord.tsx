import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from "react-i18next";
import { FileText, FileType, ArrowRight } from 'lucide-react';

export default function PdfToWord({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    const [inputPath, setInputPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        const unlisten = listen('tauri://drag-drop', (event: any) => {
            if (!isActive) return;
            const droppedFiles = event.payload.paths as string[];
            const pdfFiles = droppedFiles.filter(p => p.toLowerCase().endsWith('.pdf'));

            if (pdfFiles.length > 0) {
                setInputPath(pdfFiles[0]);
                setError('');
                setSuccess('');
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

    async function selectFile() {
        try {
            const file = await open({
                multiple: false,
                filters: [{ name: 'PDF', extensions: ['pdf'] }]
            });
            if (file && typeof file === 'string') {
                setInputPath(file);
                setError('');
                setSuccess('');
            }
        } catch (err) {
            alert(t('common.error') + ": " + err);
        }
    }

    async function handleConvert() {
        if (!inputPath) {
            setError(t('common.error'));
            return;
        }

        try {
            const outputFile = await save({
                filters: [{ name: 'Word Document', extensions: ['docx'] }],
                defaultPath: 'converted.docx'
            });

            if (!outputFile) return;

            setLoading(true);
            setError('');
            setSuccess('');

            await invoke('pdf_to_word', {
                input: inputPath,
                output: outputFile
            });
            setSuccess(t('word.successMsg', { path: outputFile }));
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
            <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${isDragOver ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
                    <FileType className="w-5 h-5 text-indigo-600" />
                    {t('word.title')}
                </h2>

                <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg mb-4 border border-yellow-200">
                    {t('word.warning')}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('split.inputLabel')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputPath}
                                readOnly
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                                placeholder={t('split.selectPlaceholder')}
                            />
                            <button
                                onClick={selectFile}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                                {t('common.select')}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleConvert}
                        disabled={loading || !inputPath}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? t('common.processing') : (
                            <>
                                {t('word.action')}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm flex items-center gap-2">
                    <FileType className="w-4 h-4" />
                    {success}
                </div>
            )}
        </div>
    );
}
