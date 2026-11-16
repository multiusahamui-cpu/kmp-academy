import React from 'react';
import { UserRole } from '../types';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onChange: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onChange }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white shadow-xl rounded-lg p-3 border border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase mb-2 text-center">Development Mode: Switch Role</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(UserRole) as Array<keyof typeof UserRole>).map((roleKey) => (
          <button
            key={roleKey}
            onClick={() => onChange(UserRole[roleKey])}
            className={`text-xs px-2 py-1 rounded border ${
              currentRole === UserRole[roleKey]
                ? 'bg-kodman-600 text-white border-kodman-600'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {roleKey}
          </button>
        ))}
      </div>
    </div>
  );
};