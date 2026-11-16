import React from 'react';
import { UserRole } from '../types';
import { GraduationCap, Volume2, ShieldCheck, Star } from 'lucide-react';
import { APP_NAME } from '../constants';

interface IdentityCardProps {
  role: UserRole;
  name: string;
  avatarUrl?: string;
  joinDate: Date; // Member Since
  isActive: boolean; // For Mentor/Creator approval check
  hasPurchased: boolean; // For Student purchase check
  sequence?: number; // Optional sequence number from DB
}

const IdentityCard: React.FC<IdentityCardProps> = ({ 
  role, 
  name, 
  avatarUrl, 
  joinDate, 
  isActive, 
  hasPurchased,
  sequence = 1
}) => {
  
  // 1. Visibility Logic
  if (role === UserRole.STUDENT && !hasPurchased) return null;
  if ((role === UserRole.MENTOR || role === UserRole.CREATOR) && !isActive) return null;

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
          bg: "bg-gradient-to-br from-kodman-500 via-kodman-600 to-kodman-800",
          text: "text-white",
          border: "border-kodman-400",
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
  const year = joinDate.getFullYear().toString().slice(-2);
  const month = (joinDate.getMonth() + 1).toString().padStart(2, '0');
  
  // Format Sequence: Pad with zeros based on role type importance? Or just standard 5-6 digits.
  // Standard format: PREFIX.YY.MM.SEQUENCE (e.g., A.23.10.00001)
  const sequenceStr = sequence.toString().padStart(6, '0');
  const cardNumber = `${style.prefix}.${year}.${month}.${sequenceStr}`;

  return (
    <div className="w-full max-w-[420px] aspect-[1.586/1] rounded-2xl shadow-2xl relative overflow-hidden transition-transform hover:scale-105 duration-300 mx-auto font-sans group">
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
                <p className={`font-mono text-xl sm:text-2xl font-bold tracking-widest drop-shadow-md shadow-black/10 ${style.isPremium ? 'text-yellow-100' : ''}`}>{cardNumber}</p>
                <p className={`font-sans text-xs font-bold uppercase tracking-wider opacity-90 truncate max-w-[200px] ${style.isPremium ? 'text-yellow-500' : ''}`}>{name}</p>
             </div>

             <div className="text-right flex flex-col items-end">
                <p className="text-[7px] uppercase font-bold opacity-75 mb-0.5">Member Sejak</p>
                <p className="font-mono text-sm font-bold tracking-wide">{month}/{year}</p>
             </div>
          </div>

       </div>
    </div>
  );
};

export default IdentityCard;