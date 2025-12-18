import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from "react-i18next";
import { FileImage, Save, Trash2, Plus, AlertCircle } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableImage({ id, path, onRemove }: { id: string, path: string, onRemove: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group bg-white border rounded-lg p-2 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow aspect-square overflow-hidden ${isDragging ? 'z-50 ring-2 ring-indigo-500' : 'border-slate-200'}`}
            {...attributes}
            {...listeners}
        >
            <div className="flex-1 w-full h-full relative overflow-hidden rounded bg-slate-50">
                <img
                    src={convertFileSrc(path)}
                    alt="thumbnail"
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                />
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            <div className="w-full px-1">
                <p className="text-[10px] text-slate-500 truncate text-center" title={path}>
                    {path.split(/[/\\]/).pop()}
                </p>
            </div>
        </div>
    );
}

export default function ImageToPdf({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        const unlisten = listen('tauri://drag-drop', (event: any) => {
            if (!isActive) return; // Only handle drop if active
            const droppedFiles = event.payload.paths as string[];
            const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tif', '.tiff'];
            const filtered = droppedFiles.filter(path =>
                validExtensions.some(ext => path.toLowerCase().endsWith(ext))
            );

            if (filtered.length > 0) {
                setFiles(prev => [...prev, ...filtered]);
                setSuccess('');
                setError('');
            } else if (droppedFiles.length > 0) {
                setError(t('image.noValidImages'));
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
                filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp'] }]
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

    function removeFile(path: string) {
        setFiles(prev => prev.filter(p => p !== path));
    }

    async function handleConvert() {
        if (files.length < 1) {
            setError(t('image.minImagesError'));
            return;
        }

        try {
            const outputFile = await save({
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: 'images.pdf'
            });

            if (!outputFile) return;

            setLoading(true);
            setError('');
            setSuccess('');

            await invoke('image_to_pdf', {
                images: files,
                output: outputFile
            });
            setSuccess(t('image.successMsg', { count: files.length, path: outputFile }));
            setFiles([]);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    function handleDragStart(event: any) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event: any) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setFiles((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
    }

    function handleClearAll() {
        setFiles([]);
        setSuccess('');
        setError('');
        setShowClearConfirm(false);
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto h-full flex flex-col relative">
            {/* Custom Confirmation Modal */}
            {showClearConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] transition-all rounded-xl">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 w-full max-w-sm transform scale-100 transition-all animate-in fade-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {t('common.clearAll')}?
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {t('image.clearConfirmMsg')}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    className="px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 shadow-sm shadow-red-200 transition-all hover:shadow-md hover:shadow-red-200"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors flex-none ${isDragOver ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
                        <FileImage className="w-5 h-5 text-indigo-600" />
                        {t('image.title')}
                    </h2>
                    <div className="flex gap-2">
                        {files.length > 0 && (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                                title={t('common.clearAll')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={addFiles}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            {t('common.addFiles')}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
                )}
                {success && (
                    <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        {success}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 border border-slate-200 rounded-xl p-4">
                {files.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileImage className="w-12 h-12 mb-3 opacity-20" />
                        <p>{t('image.inputPlaceholder')}</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={files}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {files.map((file) => (
                                    <SortableImage
                                        key={file}
                                        id={file}
                                        path={file}
                                        onRemove={() => removeFile(file)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId ? (
                                <div className="bg-white border-2 border-indigo-500 rounded-lg p-2 flex flex-col items-center gap-2 shadow-xl aspect-square overflow-hidden opacity-90 cursor-grabbing w-32">
                                    <div className="flex-1 w-full h-full relative overflow-hidden rounded bg-slate-50">
                                        <img
                                            src={convertFileSrc(activeId)}
                                            alt="thumbnail"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            <div className="flex-none">
                <button
                    onClick={handleConvert}
                    disabled={loading || files.length < 1}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? t('common.processing') : (
                        <>
                            <Save className="w-4 h-4" />
                            {t('image.action')}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
