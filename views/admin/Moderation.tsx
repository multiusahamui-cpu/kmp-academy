import React from 'react';
import { Check, X, Eye, FileText } from 'lucide-react';
import { MOCK_COURSES } from '../../constants';

const Moderation: React.FC = () => {
  // Filter only pending or draft courses for demo
  const pendingCourses = MOCK_COURSES.filter(c => c.status === 'PENDING_REVIEW' || c.status === 'DRAFT');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Moderasi Konten</h2>
      <p className="mb-6 text-gray-600">Review kursus yang diajukan oleh Creator sebelum dirilis ke Etalase Publik.</p>

      {pendingCourses.length === 0 ? (
        <div className="bg-white p-12 rounded-lg text-center text-gray-500 border border-dashed border-gray-300">
           Tidak ada konten yang menunggu moderasi saat ini.
        </div>
      ) : (
        <div className="grid gap-6">
          {pendingCourses.map(course => (
             <div key={course.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6">
                <img src={course.thumbnail} alt={course.title} className="w-full md:w-48 h-32 object-cover rounded-md" />
                <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <div>
                         <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800 mb-2">
                            {course.status.replace('_', ' ')}
                         </span>
                         <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                         <p className="text-sm text-gray-500 mb-2">Oleh: {course.instructor} • Tipe: {course.type}</p>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-bold text-kodman-600">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(course.price)}
                         </div>
                      </div>
                   </div>
                   <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                   
                   <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <button className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm">
                         <Eye size={16} className="mr-2" /> Preview Materi
                      </button>
                      <div className="flex-1"></div>
                      <button className="flex items-center px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-sm">
                         <X size={16} className="mr-2" /> Tolak
                      </button>
                      <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold">
                         <Check size={16} className="mr-2" /> Approve & Rilis
                      </button>
                   </div>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Moderation;