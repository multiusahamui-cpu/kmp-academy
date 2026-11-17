import React, { useEffect, useState } from 'react';
import { CronJob } from '../../types';
import { Activity, Play, Clock, AlertTriangle, CheckCircle, RefreshCcw } from 'lucide-react';

const MOCK_JOBS: CronJob[] = [
  { id: '1', name: 'Daily Payout Settlement', schedule: '0 1 * * *', lastRun: '2023-10-26 01:00', nextRun: '2023-10-27 01:00', status: 'SUCCESS', description: 'Memproses mutasi saldo dari Virtual Account ke Dompet User.' },
  { id: '2', name: 'Subscription Renewal', schedule: '0 0 * * *', lastRun: '2023-10-26 00:00', nextRun: '2023-10-27 00:00', status: 'SUCCESS', description: 'Mengecek masa aktif kursus berlangganan.' },
  { id: '3', name: 'Course Reminder Email', schedule: '0 8 * * *', lastRun: '2023-10-26 08:00', nextRun: '2023-10-27 08:00', status: 'RUNNING', description: 'Mengirim email notifikasi kelas yang akan dimulai hari ini.' },
  { id: '4', name: 'Database Backup', schedule: '0 3 * * *', lastRun: '2023-10-25 03:00', nextRun: '2023-10-26 03:00', status: 'FAILED', description: 'Backup full database ke S3 Bucket.' },
];

const CronManager: React.FC = () => {
  const [jobs, setJobs] = useState<CronJob[]>(MOCK_JOBS);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Simulate realtime monitoring
  useEffect(() => {
    const interval = setInterval(() => {
       setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRun = (id: string) => {
    // Optimistic UI update
    setJobs(prev => prev.map(job => 
       job.id === id ? { ...job, status: 'RUNNING' } : job
    ));
    
    // Simulate API call delay
    setTimeout(() => {
       setJobs(prev => prev.map(job => 
          job.id === id ? { ...job, status: 'SUCCESS', lastRun: new Date().toLocaleString() } : job
       ));
    }, 2000);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
               <Activity className="mr-3 text-kodman-600" />
               System Cron Jobs
            </h2>
            <p className="text-gray-500">Monitoring background tasks untuk operasional production.</p>
          </div>
          <div className="text-right text-xs text-gray-400">
             Last Updated: <span className="font-mono">{lastUpdated.toLocaleTimeString()}</span>
          </div>
       </div>

       {/* Status Summary */}
       <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
             <div className="text-xs font-bold text-gray-500 uppercase">Total Jobs</div>
             <div className="text-2xl font-bold text-gray-900">{jobs.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
             <div className="text-xs font-bold text-green-600 uppercase">Success Rate</div>
             <div className="text-2xl font-bold text-green-700">98.5%</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
             <div className="text-xs font-bold text-blue-600 uppercase">Active Threads</div>
             <div className="text-2xl font-bold text-blue-700">1</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
             <div className="text-xs font-bold text-red-600 uppercase">Failed Jobs</div>
             <div className="text-2xl font-bold text-red-700">{jobs.filter(j => j.status === 'FAILED').length}</div>
          </div>
       </div>

       {/* Job Table */}
       <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
                <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule (Cron)</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Run</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                   <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                         <div className="text-sm font-bold text-gray-900">{job.name}</div>
                         <div className="text-xs text-gray-500">{job.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="px-2 py-1 rounded bg-gray-100 font-mono text-xs text-gray-600 border border-gray-300">
                            {job.schedule}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         {job.status === 'SUCCESS' && <span className="flex items-center text-xs font-bold text-green-600"><CheckCircle size={14} className="mr-1"/> Success</span>}
                         {job.status === 'FAILED' && <span className="flex items-center text-xs font-bold text-red-600"><AlertTriangle size={14} className="mr-1"/> Failed</span>}
                         {job.status === 'RUNNING' && <span className="flex items-center text-xs font-bold text-blue-600"><RefreshCcw size={14} className="mr-1 animate-spin"/> Running</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {job.lastRun}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                         <button 
                           onClick={() => handleManualRun(job.id)}
                           disabled={job.status === 'RUNNING'}
                           className={`p-2 rounded hover:bg-gray-100 text-gray-500 transition ${job.status === 'RUNNING' ? 'opacity-50 cursor-not-allowed' : 'hover:text-kodman-600'}`}
                           title="Run Now"
                         >
                            <Play size={16} />
                         </button>
                         <button className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900" title="View Logs">
                            <Clock size={16} />
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default CronManager;