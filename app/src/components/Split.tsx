import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from "react-i18next";
import { FileUp, FolderOutput, Scissors } from 'lucide-react';

export default function Split({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    const [inputPath, setInputPath] = useState('');
    const [outputDir, setOutputDir] = useState('');
    const [startPage, setStartPage] = useState<string>('1');
    const [endPage, setEndPage] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        const unlisten = listen('tauri://drag-drop', (event: any) => {
            if (!isActive) return;
            const droppedFiles = event.payload.paths as string[];
            const pdfFiles = droppedFiles.filter(p => p.toLowerCase().endsWith('.pdf'));

            if (pdfFiles.length > 0) {
                setInputPath(pdfFiles[0]);
                setError('');
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
            if (file) {
                if (typeof file === 'string') {
                    setInputPath(file);
                }
            }
        } catch (err) {
            alert(t('common.error') + ": " + err);
        }
    }

    async function selectDir() {
        try {
            const dir = await open({
                directory: true,
                multiple: false,
            });
            if (dir && typeof dir === 'string') {
                setOutputDir(dir);
            }
        } catch (err) {
            alert(t('common.error') + ": " + err);
        }
    }

    async function handleSplit() {
        if (!inputPath || !outputDir || !startPage || !endPage) {
            setError(t('split.fillError'));
            return;
        }
        setLoading(true);
        setError('');
        setResult([]);

        try {
            const res = await invoke<string[]>('split_pdf', {
                input: inputPath,
                start: parseInt(startPage),
                end: parseInt(endPage),
                outputDir: outputDir
            });
            setResult(res);
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
                    <Scissors className="w-5 h-5 text-indigo-600" />
                    {t('split.title')}
                </h2>

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
                                <FileUp className="w-4 h-4" />
                                {t('common.select')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('split.startPage')}</label>
                            <input
                                type="number"
                                value={startPage}
                                onChange={e => setStartPage(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('split.endPage')}</label>
                            <input
                                type="number"
                                value={endPage}
                                onChange={e => setEndPage(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                min="1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('split.outputDir')}</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={outputDir}
                                readOnly
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                                placeholder={t('split.dirPlaceholder')}
                            />
                            <button
                                onClick={selectDir}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors"
                            >
                                <FolderOutput className="w-4 h-4" />
                                {t('common.select')}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleSplit}
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
                    >
                        {loading ? t('common.processing') : t('split.action')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                    {error}
                </div>
            )}

            {result.length > 0 && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                    <p className="font-semibold mb-2">{t('split.successMsg')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {result.map(path => (
                            <li key={path} className="break-all">{path}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
