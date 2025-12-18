import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useTranslation } from "react-i18next";
import { FileStack, Save, Trash2, FileText } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
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

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PageItem {
    id: string; // Unique ID for dnd-kit
    originalIndex: number; // 1-based original page number
    displayIndex: number;  // 1-based current display index
}

function SortablePage({ id, originalPage, onRemove, t }: { id: string, originalPage: number, onRemove?: () => void, t: any }) {
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
            className={`relative group bg-white border rounded-lg p-2 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow aspect-[3/4] overflow-hidden ${isDragging ? 'z-50 ring-2 ring-indigo-500' : 'border-slate-200'}`}
            {...attributes}
            {...listeners}
        >
            <div className="w-full flex justify-between items-start z-10 absolute top-2 px-2">
                <span className="text-xs font-mono text-slate-600 bg-slate-100/90 px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing shadow-sm backdrop-blur-sm">
                    #{originalPage}
                </span>
                {onRemove && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="text-slate-400 hover:text-red-500 bg-white/80 p-0.5 rounded-full transition-colors backdrop-blur-sm hover:bg-white"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="flex-1 w-full h-full relative overflow-hidden rounded bg-slate-50 flex items-center justify-center">
                <div className="w-full h-full pointer-events-none flex items-center justify-center">
                    <Page
                        pageNumber={originalPage}
                        height={200}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={
                            <div className="flex items-center justify-center w-full h-full">
                                <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                        }
                        error={
                            <div className="flex items-center justify-center w-full h-full">
                                <FileText className="w-8 h-8 text-red-200" />
                            </div>
                        }
                    />
                </div>
            </div>

            <div className="w-full text-center border-t border-slate-100 pt-1 mt-1 z-10 bg-white">
                <span className="text-[10px] text-slate-500 font-medium">{t('edit.page')} {originalPage}</span>
            </div>
        </div>
    );
}

// ... (imports remain)

export default function EditPdf({ isActive }: { isActive: boolean }) {
    const { t } = useTranslation();
    const [inputPath, setInputPath] = useState('');
    const [pages, setPages] = useState<PageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);

    const [isDragOver, setIsDragOver] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    async function handleSelectFile(path?: string) { // Updated to accept optional path argument to reuse logic
        try {
            let file = path;
            if (!file) {
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'PDF', extensions: ['pdf'] }]
                });
                if (selected && typeof selected === 'string') {
                    file = selected;
                }
            }

            if (file && typeof file === 'string') {
                if (file === inputPath) {
                    // Force reload if same file selected
                    setPages([]);
                    setLoading(true);
                    // Use a timeout to ensure React sees the state change if we were to toggle something,
                    // but since we cleared pages, the Document might not unmount/remount if inputPath doesn't change.
                    // However, we rely on <Document> loading. If inputPath is same, <Document> won't reload.
                    // We need to fetch page count manually in this specific case to "reload" our state.
                    try {
                        const count = await invoke<number>('get_pdf_page_count', { input: file });
                        const newPages: PageItem[] = [];
                        for (let i = 1; i <= count; i++) {
                            newPages.push({ id: `page-${i}-${Date.now()}`, originalIndex: i, displayIndex: i });
                        }
                        setPages(newPages);
                    } catch (e) {
                        setError(t('common.error') + ": " + String(e));
                    } finally {
                        setLoading(false);
                    }
                } else {
                    setInputPath(file);
                    setLoading(true);
                    setPages([]); // Clear pages
                    setError('');
                }
            }
        } catch (e) {
            alert(t('common.error') + ": " + e);
        }
    }

    // Called when react-pdf successfully loads the document
    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        const newPages: PageItem[] = [];
        for (let i = 1; i <= numPages; i++) {
            newPages.push({ id: `page-${i}-${Date.now()}`, originalIndex: i, displayIndex: i });
        }
        setPages(newPages);
        setLoading(false);
    }

    function onDocumentLoadError(err: Error) {
        setError(t('common.error') + ": " + err.message);
        setLoading(false);
    }

    function handleDragStart(event: any) {
        setActiveId(event.active.id);
    }

    function handleDragEnd(event: any) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setPages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
        setActiveId(null);
    }

    useEffect(() => {
        const unlisten = listen('tauri://drag-drop', async (event: any) => {
            if (!isActive) return;
            const droppedFiles = event.payload.paths as string[];
            const pdfFiles = droppedFiles.filter(p => p.toLowerCase().endsWith('.pdf'));

            if (pdfFiles.length > 0) {
                const file = pdfFiles[0];
                handleSelectFile(file);
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

    function removePage(id: string) {
        setPages(items => items.filter(p => p.id !== id));
    }

    async function handleSave() {
        if (!inputPath || pages.length === 0) return;

        const outputFile = await save({
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            defaultPath: 'edited.pdf'
        });

        if (!outputFile) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const pageOrder = pages.map(p => p.originalIndex);
            await invoke('reorder_pdf', {
                input: inputPath,
                pageOrder: pageOrder,
                output: outputFile
            });
            setSuccess(t('edit.successMsg', { path: outputFile }));
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto h-full flex flex-col">
            <div className={`bg-white p-6 rounded-xl shadow-sm border transition-colors flex-none ${isDragOver ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-800">
                        <FileStack className="w-5 h-5 text-indigo-600" />
                        {t('edit.title')}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleSelectFile()}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            {inputPath ? t('common.changeFile') : t('common.selectFile')}
                        </button>
                        {pages.length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? t('edit.saving') : <Save className="w-4 h-4" />}
                                {t('edit.saveAction')}
                            </button>
                        )}
                    </div>
                </div>

                {inputPath && (
                    <p className="text-xs text-slate-500 mb-4 truncate">Current File: {inputPath}</p>
                )}

                {error && (
                    <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
                )}
                {success && (
                    <div className="p-3 mb-4 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>
                )}

                <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-sm text-slate-500 mb-2">
                        <span>{t('edit.pageCount', { count: pages.length })}</span>
                        <span>{t('edit.instruction')}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 border border-slate-200 rounded-xl p-4">
                {inputPath ? (
                    <Document
                        file={convertFileSrc(inputPath)}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <FileStack className="w-12 h-12 mb-3 animate-pulse" />
                                <p>Loading PDF...</p>
                            </div>
                        }
                        error={
                            <div className="h-full flex flex-col items-center justify-center text-red-400">
                                <FileText className="w-12 h-12 mb-3" />
                                <p>Failed to load PDF</p>
                            </div>
                        }
                        className="h-full"
                    >
                        {pages.length > 0 && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={pages.map(p => p.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
                                        {pages.map((page) => (
                                            <SortablePage
                                                key={page.id}
                                                id={page.id}
                                                originalPage={page.originalIndex}
                                                onRemove={() => removePage(page.id)}
                                                t={t}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                                <DragOverlay>
                                    {activeId ? (
                                        <div className="bg-white border-2 border-indigo-500 rounded-lg p-2 flex flex-col items-center gap-2 shadow-xl aspect-[3/4] overflow-hidden opacity-90 cursor-grabbing w-32 relative">
                                            <div className="absolute top-2 w-full px-2 flex justify-between z-10">
                                                <span className="text-xs font-mono text-slate-600 bg-slate-100/90 px-1.5 py-0.5 rounded shadow-sm">#</span>
                                            </div>
                                            <div className="flex-1 w-full h-full relative overflow-hidden rounded bg-slate-50 flex items-center justify-center">
                                                {/* Render a placeholder or the page again for drag overlay. Rendering page again might be flickering. 
                                                     Let's just show a clear "Moving" state or simple icon to be fast. 
                                                     Actually, a static Page render might work if cached. Let's try displaying the icon to ensure smoothness.
                                                  */}
                                                <FileText className="w-8 h-8 text-indigo-500" />
                                            </div>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        )}
                    </Document>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <FileStack className="w-12 h-12 mb-3 opacity-20" />
                        <p>{t('edit.emptyState')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
