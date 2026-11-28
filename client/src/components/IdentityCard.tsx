import React from 'react';
import { UserRole } from '../types';
import { GraduationCap, Volume2, ShieldCheck, Star } from 'lucide-react';
import { APP_NAME } from '../constants';
import { cardPrefixFor, shadowCardNumber } from '@shared/card';
import { useT } from '../i18n';

interface IdentityCardProps {
  role: UserRole;
  name: string;
  avatarUrl?: string;
  cardNumber?: string | null; // Nomor kartu beku dari server; kosong = belum terbit
  issuedAt?: Date | null; // Tanggal terbit kartu
}

const IdentityCard: React.FC<IdentityCardProps> = ({ 
  role, 
  name, 
  avatarUrl, 
  cardNumber,
  issuedAt
}) => {
  const t = useT();

  // 2. Style & Prefix Configuration based on A, C, M, S Requirement
  const getCardStyle = () => {
    switch (role) {
      case UserRole.SUPERADMIN:
      case UserRole.ADMIN_SYSTEM:
      case UserRole.DIRECTOR:
        // Group A: Internal Management
        return {
          bg: role === UserRole.DIRECTOR 
              ? "bg-slate-950" 
              : "bg-gradient-to-br from-gray-800 via-gray-900 to-black",
          text: role === UserRole.DIRECTOR ? "text-yellow-50" : "text-gray-100",
          border: role === UserRole.DIRECTOR ? "border-yellow-600" : "border-gray-600",
          prefix: "A",
          tierName: role === UserRole.DIRECTOR ? "EXECUTIVE DIRECTOR" : "INTERNAL MANAGEMENT",
          isPremium: role === UserRole.DIRECTOR,
          icon: ShieldCheck
        };

      case UserRole.CREATOR:
        // Group C: Content Creator
        return {
          bg: "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
          text: "text-white",
          border: "border-yellow-400",
          prefix: "C",
          tierName: "CONTENT CREATOR",
          isPremium: false,
          icon: Star
        };

      case UserRole.MENTOR:
        // Group M: Mentor
        return {
          bg: "bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-800",
          text: "text-white",
          border: "border-purple-300",
          prefix: "M",
          tierName: "ACADEMIC MENTOR",
          isPremium: false,
          icon: GraduationCap
        };

      case UserRole.STUDENT:
        // Group S: Student
        return {
          bg: "bg-gradient-to-br from-digitalcoop-500 via-digitalcoop-600 to-digitalcoop-800",
          text: "text-white",
          border: "border-digitalcoop-400",
          prefix: "S",
          tierName: "STUDENT MEMBER",
          isPremium: false,
          icon: GraduationCap
        };

      default:
        return { 
          bg: "bg-gray-500", 
          text: "text-white", 
          border: "", 
          prefix: "U", 
          tierName: "UNKNOWN", 
          isPremium: false, 
          icon: GraduationCap 
        };
    }
  };

  const style = getCardStyle();

  // Kartu belum terbit: tampil sebagai bayangan dengan nomor urut bertanda bintang.
  const isPending = !cardNumber;
  const displayNumber = cardNumber ?? shadowCardNumber(cardPrefixFor(role) ?? style.prefix, new Date());
  const issued = issuedAt ?? null;
  const sinceLabel = issued
    ? `${(issued.getMonth() + 1).toString().padStart(2, '0')}/${issued.getFullYear().toString().slice(-2)}`
    : '--/--';
  const pendingHint = role === UserRole.STUDENT
    ? t('misc.cardPendS')
    : t('misc.cardPendO');

  return (
    <div className="relative w-full max-w-[420px] mx-auto group">
    <div className={`w-full aspect-[1.586/1] rounded-2xl shadow-2xl relative overflow-hidden transition-transform hover:scale-105 duration-300 font-sans ${isPending ? 'grayscale opacity-70' : ''}`}>
       {/* Background */}
       <div className={`absolute inset-0 ${style.bg} transition-all duration-500`}></div>
       
       {/* Texture/Pattern Overlay */}
       <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
       <div className={`absolute inset-0 border-[1px] ${style.border} rounded-2xl ${style.isPremium ? 'opacity-80' : 'opacity-40'}`}></div>

       {/* Premium Shine Effect for Director */}
       {style.isPremium && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-30 pointer-events-none"></div>
       )}

       {/* Content Container */}
       <div className={`relative h-full p-6 flex flex-col ${style.text}`}>
          
          {/* TOP ROW: Header */}
          <div className="flex justify-between items-start z-10">
             {/* Logo & Title Left Aligned - Tight Layout */}
             <div className="flex items-center gap-2">
                <div className={`${style.isPremium ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/20 text-current'} p-2 rounded-lg backdrop-blur-sm shadow-inner`}>
                   <style.icon size={24} />
                </div>
                <div>
                   <h3 className={`font-extrabold text-sm tracking-widest uppercase opacity-95 leading-none mb-1 shadow-sm ${style.isPremium ? 'text-yellow-500' : ''}`}>{APP_NAME}</h3>
                   <p className="text-[9px] font-bold opacity-80 tracking-wider leading-none">{style.tierName}</p>
                </div>
             </div>
             
             {/* Profile Photo - Top Right */}
             <div className={`w-12 h-12 rounded-full border-2 ${style.isPremium ? 'border-yellow-600' : 'border-white/40'} shadow-md overflow-hidden bg-gray-300 shrink-0`}>
                 <img src={avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=random`} alt="Profile" className="w-full h-full object-cover" />
             </div>
          </div>

          {/* MIDDLE ROW: Chip & Speaker */}
          <div className="flex-1 flex items-center justify-between px-1 z-10">
             {/* EMV Chip Simulation */}
             <div className={`w-11 h-8 rounded-md border relative overflow-hidden shadow-sm ${style.isPremium ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 border-yellow-200' : 'bg-gradient-to-br from-yellow-200 to-yellow-400 border-yellow-600/60'}`}>
                <div className="absolute inset-0 border border-yellow-900/20 rounded-md"></div>
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-yellow-900/40"></div>
                <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-yellow-900/40"></div>
                <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-yellow-900/40"></div>
             </div>

             {/* Speaker / Contactless Icon */}
             <Volume2 size={24} className={`opacity-80 drop-shadow-sm ${style.isPremium ? 'text-yellow-600' : ''}`} />
          </div>

          {/* BOTTOM ROW: Footer */}
          <div className="flex justify-between items-end z-10">
             <div className="flex flex-col gap-1">
                <p className={`font-mono text-xl sm:text-2xl font-bold tracking-widest drop-shadow-md shadow-black/10 ${style.isPremium ? 'text-yellow-100' : ''}`}>{displayNumber}</p>
                <p className={`font-sans text-xs font-bold uppercase tracking-wider opacity-90 truncate max-w-[200px] ${style.isPremium ? 'text-yellow-500' : ''}`}>{name}</p>
             </div>

             <div className="text-right flex flex-col items-end">
                <p className="text-[7px] uppercase font-bold opacity-75 mb-0.5">{t('misc.cardIssued')}</p>
                <p className="font-mono text-sm font-bold tracking-wide">{sinceLabel}</p>
             </div>
          </div>

       </div>
    </div>
    {isPending && (
      <div role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-2 translate-y-full z-20 w-64 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        {pendingHint}
      </div>
    )}
    </div>
  );
};

export default IdentityCard;