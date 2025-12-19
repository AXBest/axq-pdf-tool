import { useState } from "react";
import { useTranslation } from "react-i18next";
import Split from "./components/Split";
import Merge from "./components/Merge";
import ImageToPdf from "./components/ImageToPdf";
import EditPdf from "./components/EditPdf";
import PdfToWord from "./components/PdfToWord";
import PdfToImage from "./components/PdfToImage";

function App() {
  const [activeTab, setActiveTab] = useState<'split' | 'merge' | 'image' | 'edit' | 'word' | 'pdf-image'>('split');
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 py-4 px-6 shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="p-1.5 bg-indigo-600 rounded text-white text-xs">PDF</span>
          {t('app.title')}
        </h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('split')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'split'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.split')}
            </button>
            <button
              onClick={() => setActiveTab('merge')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'merge'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.merge')}
            </button>
            <button
              onClick={() => setActiveTab('image')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'image'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.image')}
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'edit'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.edit')}
            </button>
            <button
              onClick={() => setActiveTab('word')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'word'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.word')}
            </button>
            <button
              onClick={() => setActiveTab('pdf-image')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pdf-image'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t('nav.pdfImage')}
            </button>
          </nav>

          <div className="mt-auto p-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              {t('app.poweredBy')}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto relative">
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'split' ? '' : 'hidden'}`}>
            <Split isActive={activeTab === 'split'} />
          </div>
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'merge' ? '' : 'hidden'}`}>
            <Merge isActive={activeTab === 'merge'} />
          </div>
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'image' ? '' : 'hidden'}`}>
            <ImageToPdf isActive={activeTab === 'image'} />
          </div>
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'edit' ? '' : 'hidden'}`}>
            <EditPdf isActive={activeTab === 'edit'} />
          </div>
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'word' ? '' : 'hidden'}`}>
            <PdfToWord isActive={activeTab === 'word'} />
          </div>
          <div className={`absolute inset-0 overflow-auto ${activeTab === 'pdf-image' ? '' : 'hidden'}`}>
            <PdfToImage isActive={activeTab === 'pdf-image'} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
