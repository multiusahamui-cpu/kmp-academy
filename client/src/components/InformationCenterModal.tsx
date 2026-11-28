import React, { useState } from "react";
import {
  X,
  Target,
  Zap,
  Server,
  GitMerge,
  Users,
  HelpCircle,
  Shield,
  FileText,
  Book,
  AlertTriangle,
  Code2,
  Heart,
} from "lucide-react";
import { useT } from "../i18n";

// Teks kaya: **tebal** dan *miring*.
const rich = (s: string): React.ReactNode[] =>
  s.split(/(\*\*.+?\*\*|\*.+?\*)/g).map((p, i) =>
    p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.length > 2 && p.startsWith("*") ? <em key={i}>{p.slice(1, -1)}</em> : p,
  );

interface InformationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InformationCenterModal: React.FC<InformationCenterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useT();
  const I = (k: string) => t(`info.${k}`);
  const [activeTab, setActiveTab] = useState("OBJECTIVE");

  if (!isOpen) return null;

  const MENU_ITEMS = [
    { id: "OBJECTIVE", label: I('mObjective'), icon: Target },
    { id: "ADVANTAGES", label: I('mAdvantages'), icon: Zap },
    { id: "ARCHITECTURE", label: I('mArchitecture'), icon: Server },
    { id: "WORKFLOW", label: I('mWorkflow'), icon: GitMerge },
    { id: "ROLES", label: I('mRoles'), icon: Users },
    { id: "FAQ", label: I('mFaq'), icon: HelpCircle },
    { id: "PRIVACY", label: I('mPrivacy'), icon: Shield },
    { id: "TERMS", label: I('mTerms'), icon: FileText },
    { id: "GLOSSARY", label: I('mGlossary'), icon: Book },
    { id: "DISCLAIMER", label: I('mDisclaimer'), icon: AlertTriangle },
    { id: "TECH", label: I('mTech'), icon: Code2 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "OBJECTIVE":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('o1')}</h3>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">{rich(I('o2'))}</p>
            <ul className="list-disc pl-5 space-y-3 text-gray-600 dark:text-slate-400">
              <li className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border-l-4 border-digitalcoop-500 shadow-sm">
                <strong className="text-digitalcoop-700 dark:text-digitalcoop-300 block mb-1 text-base">{I('o3')}</strong>
                <span className="text-sm">{rich(I('o4'))}</span>
              </li>
              <li>{I('o5')}</li>
              <li>{I('o6')}</li>
              <li>{I('o7')}</li>
              <li>{I('o8')}</li>
            </ul>
          </div>
        );
      case "ADVANTAGES":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('a1')}</h3>
            <div className="grid gap-4">
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{I('a2')}</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">{I('a3')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{I('a4')}</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">{I('a5')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{I('a6')}</h4>
                <p className="text-sm text-gray-600 dark:text-slate-400">{I('a7')}</p>
              </div>
            </div>
          </div>
        );
      case "ARCHITECTURE":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('r1')}</h3>
            <p className="text-gray-700 dark:text-slate-300">{rich(I('r2'))}</p>
            <div className="p-4 bg-slate-900 text-white rounded-lg font-mono text-xs overflow-x-auto">
              <p>USER (Browser) &lt;--&gt; [LOAD BALANCER]</p>
              <p className="pl-8">|</p>
              <p className="pl-8">v</p>
              <p>[FRONTEND: React + Vite + Tailwind]</p>
              <p className="pl-8">|</p>
              <p className="pl-8">v (REST API)</p>
              <p>[BACKEND: Node.js + Express]</p>
              <p className="pl-8">|--&gt; [AUTH: JWT Middleware]</p>
              <p className="pl-8">
                |--&gt; [DATABASE: PostgreSQL + Drizzle ORM]
              </p>
              <p className="pl-8">|--&gt; [STORAGE: Local CDN / S3]</p>
            </div>
          </div>
        );
      case "WORKFLOW":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('w1')}</h3>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  1
                </span>
                <div>{rich(I('w2'))}</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded h-fit">
                  2
                </span>
                <div>{rich(I('w3'))}</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  3
                </span>
                <div>{rich(I('w4'))}</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  4
                </span>
                <div>{rich(I('w5'))}</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  5
                </span>
                <div>{rich(I('w6'))}</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded h-fit">
                  6
                </span>
                <div>{rich(I('w7'))}</div>
              </li>
            </ul>
          </div>
        );
      case "ROLES":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('l1')}</h3>

            {/* Mandatory Path Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">{I('l2')}</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{rich(I('l3'))}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-amber-800 dark:text-amber-300">
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
                  Student
                </span>
                <span>→</span>
                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-bold">
                  Creator
                </span>
                <span className="text-amber-600">{I('l4')}</span>
                <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                  Mentor
                </span>
                <span className="text-amber-600">{I('l5')}</span>
              </div>
            </div>

            {/* Role Cards */}
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-bold">
                  Student{" "}
                  <span className="text-xs font-normal text-blue-600 dark:text-blue-400 ml-1">{I('l6')}</span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l7')}</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-3">
                <h4 className="font-bold">
                  Content Creator{" "}
                  <span className="text-xs font-normal text-orange-600 dark:text-orange-400 ml-1">{I('l8')}</span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l9')}</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-bold">
                  Mentor{" "}
                  <span className="text-xs font-normal text-purple-600 dark:text-purple-400 ml-1">{I('l8')}</span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l10')}</p>
              </div>
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-bold">
                  Creator + Mentor{" "}
                  <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-1">{I('l11')}</span>
                </h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l12')}</p>
              </div>
              <div className="border-l-4 border-yellow-500 pl-3">
                <h4 className="font-bold">{I('l13')}</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l14')}</p>
              </div>
              <div className="border-l-4 border-red-500 pl-3">
                <h4 className="font-bold">{I('l15')}</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{I('l16')}</p>
              </div>
            </div>
          </div>
        );
      case "FAQ":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('f1')}</h3>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">{I('f2')}</summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{I('f3')}</p>
            </details>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">{I('f4')}</summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{I('f5')}</p>
            </details>
            <details className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg cursor-pointer">
              <summary className="font-bold text-gray-900 dark:text-white text-sm">{I('f6')}</summary>
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{I('f7')}</p>
            </details>
          </div>
        );
      case "PRIVACY":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('p1')}</h3>
            <p className="text-sm text-gray-700 dark:text-slate-300">{I('p2')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{I('p3')}</p>
          </div>
        );
      case "TERMS":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('t1')}</h3>
            <ul className="list-decimal pl-5 space-y-2 text-sm text-gray-700 dark:text-slate-300">
              <li>{I('t2')}</li>
              <li>{I('t3')}</li>
              <li>{I('t4')}</li>
              <li>{I('t5')}</li>
            </ul>
          </div>
        );
      case "GLOSSARY":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('g1')}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="text-sm">
                <strong className="text-digitalcoop-600">LMS:</strong> {I('g2')}</div>
              <div className="text-sm">
                <strong className="text-digitalcoop-600">KYC:</strong> {I('g3')}</div>
              <div className="text-sm">
                <strong className="text-digitalcoop-600">Settlement:</strong> {I('g4')}</div>
              <div className="text-sm">
                <strong className="text-digitalcoop-600">Assembling:</strong> {I('g5')}</div>
            </div>
          </div>
        );
      case "DISCLAIMER":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('d1')}</h3>
            <p className="text-sm text-gray-700 dark:text-slate-300 border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 dark:bg-yellow-900/10">{I('d2')}</p>
            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{I('d3')}</p>
          </div>
        );
      case "TECH":
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-digitalcoop-600 dark:text-digitalcoop-400 mb-4">{I('x1')}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Frontend
                </h4>
                <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
                  <li>React 18 (Hooks & Functional)</li>
                  <li>Vite (Build Tool)</li>
                  <li>Tailwind CSS (Styling)</li>
                  <li>Lucide React (Iconography)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Backend
                </h4>
                <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1">
                  <li>Node.js & Express</li>
                  <li>Drizzle ORM</li>
                  <li>PostgreSQL (Neon Tech)</li>
                  <li>JWT Auth & Bcrypt</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-800">
              <p className="text-xs text-gray-500">
                {rich(I('x2'))}
                <br />
                &copy; {new Date().getFullYear()} {I('x3')}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 md:hidden p-2 bg-gray-200 dark:bg-slate-800 rounded-full"
        >
          <X size={20} />
        </button>

        {/* Sidebar Navigation */}
        <div className="w-full md:w-1/3 bg-gray-50 dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <div className="bg-digitalcoop-600 text-white p-1.5 rounded-lg mr-2">
                <Heart size={18} fill="currentColor" />
              </div>{I('hTitle')}</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{I('hSub')}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition ${
                  activeTab === item.id
                    ? "bg-white dark:bg-slate-800 text-digitalcoop-600 dark:text-digitalcoop-400 shadow-sm border border-gray-200 dark:border-slate-700"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-900"
                }`}
              >
                <item.icon
                  size={16}
                  className={`mr-3 ${activeTab === item.id ? "text-digitalcoop-500" : "text-gray-400"}`}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900">
          {/* Header Desktop */}
          <div className="hidden md:flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-500 dark:text-slate-500 text-sm tracking-wide uppercase">
              {MENU_ITEMS.find((m) => m.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
            {renderContent()}

            {/* SPECIAL FOOTER */}
            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800 text-center">
              <p className="text-xs text-gray-400 dark:text-slate-600 font-mono flex items-center justify-center gap-2">
                <Heart
                  size={12}
                  className="text-red-500 fill-current animate-pulse"
                />{I('hMade')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationCenterModal;
