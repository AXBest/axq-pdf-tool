import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from "react-i18next";
import { FilePlus, Merge as MergeIcon, Save, Trash2, GripVertical } from 'lucide-react';

export default function Merge({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        // Enable drag and drop listeners
        const unlisten = listen('tauri://drag-drop', (event: any) => {
            if (!isActive) return;
            const droppedFiles = event.payload.paths as string[];
            const pdfs = droppedFiles.filter(path => path.toLowerCase().endsWith('.pdf'));

            if (pdfs.length > 0) {
                setFiles(prev => [...prev, ...pdfs]);
                setSuccess('');
                setError('');
            } else if (droppedFiles.length > 0) {
                setError(t('merge.noFilesError'));
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
    }, [t, isActive]);

    async function addFiles() {
        try {
            const selected = await open({
                multiple: true,
                filters: [{ name: 'PDF', extensions: ['pdf'] }]
            });

            if (selected) {
                if (Array.isArray(selected)) {
                    setFiles(prev => [...prev, ...selected]);
                } else if (typeof selected === 'string') {
                    setFiles(prev => [...prev, selected]);
                }
            }
        } catch (e) {
            alert(t('common.error') + ": " + e);
        }
    }

    function removeFile(index: number) {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    function moveFile(index: number, direction: -1 | 1) {
        if (index + direction < 0 || index + direction >= files.length) return;
        const newFiles = [...files];
        const temp = newFiles[index];
        newFiles[index] = newFiles[index + direction];
        newFiles[index + direction] = temp;
        setFiles(newFiles);
    }

    async function handleMerge() {
        if (files.length < 2) {
            setError(t('merge.minFilesError'));
            return;
        }

        try {
            const outputFile = await save({
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: 'merged.pdf'
            });

            if (!outputFile) return;

            setLoading(true);
            setError('');
            setSuccess('');

            await invoke('merge_pdf', {
                inputs: files,
                output: outputFile
            });
            setSuccess(t('merge.successMsg', { count: files.length, path: outputFile }));
            setFiles([]);
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
                    <MergeIcon className="w-5 h-5 text-indigo-600" />
                    {t('merge.title')}
                </h2>

                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={addFiles}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors text-sm"
                        >
                            <FilePlus className="w-4 h-4" />
                            {t('common.addFiles')}
                        </button>
                    </div>

                    <div className="min-h-[200px] border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-2">
                        {files.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <FilePlus className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">{t('merge.inputPlaceholder')}</p>
                            </div>
                        ) : (
                            files.map((file, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <span className="text-slate-400 cursor-move">
                                        <GripVertical className="w-4 h-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate" title={file}>{file}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => moveFile(i, -1)} disabled={i === 0} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30">↑</button>
                                        <button onClick={() => moveFile(i, 1)} disabled={i === files.length - 1} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 disabled:opacity-30">↓</button>
                                    </div>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={handleMerge}
                        disabled={loading || files.length < 2}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? t('common.processing') : (
                            <>
                                <MergeIcon className="w-4 h-4" />
                                {t('merge.action')}
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
                    <Save className="w-4 h-4" />
                    {success}
                </div>
            )}
        </div>
    );
}
