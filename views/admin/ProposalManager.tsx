import React, { useState } from "react";
import { WorkshopProposal, RoleRequest, UserRole } from "../../types";
import { Check, X, User, Calendar, DollarSign } from "lucide-react";

// Mock Data
const MOCK_PROPOSALS: WorkshopProposal[] = [
  {
    id: "prop-1",
    courseId: "1",
    courseTitle: "Mastering React & Vite Ecosystem",
    mentorId: "user-99",
    mentorName: "Siti Aminah",
    creatorName: "Budi Santoso",
    proposedSchedule: "Sabtu & Minggu, 10:00 - 12:00 WIB",
    startDate: "2023-11-15",
    maxParticipants: 20,
    proposedPrice: 750000,
    revenueShare: { platform: 20, creator: 10, mentor: 70 },
    status: "PENDING",
  },
];

const MOCK_ROLE_REQUESTS: RoleRequest[] = [
  {
    id: "role-1",
    userId: "user-45",
    userName: "John Doe",
    requestedRole: UserRole.MENTOR,
    reason:
      "Saya memiliki pengalaman 5 tahun di digital marketing dan ingin membuka kelas.",
    status: "PENDING",
    date: "2023-10-26",
  },
];

const ProposalManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"WORKSHOPS" | "ROLES">(
    "WORKSHOPS",
  );
  const [proposals, setProposals] = useState(MOCK_PROPOSALS);
  const [roleRequests, setRoleRequests] = useState(MOCK_ROLE_REQUESTS);

  const handleApproveProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    alert("Proposal Workshop disetujui dan akan tayang di katalog!");
  };

  const handleApproveRole = (id: string) => {
    setRoleRequests((prev) => prev.filter((r) => r.id !== id));
    alert("User Role berhasil diupgrade!");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Approval Center</h2>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("WORKSHOPS")}
          className={`pb-3 px-2 font-medium text-sm ${activeTab === "WORKSHOPS" ? "text-kodman-600 border-b-2 border-kodman-600" : "text-gray-500"}`}
        >
          Workshop Proposals ({proposals.length})
        </button>
        <button
          onClick={() => setActiveTab("ROLES")}
          className={`pb-3 px-2 font-medium text-sm ${activeTab === "ROLES" ? "text-kodman-600 border-b-2 border-kodman-600" : "text-gray-500"}`}
        >
          Role Requests ({roleRequests.length})
        </button>
      </div>

      {activeTab === "WORKSHOPS" && (
        <div className="space-y-4">
          {proposals.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Tidak ada proposal workshop baru.
            </p>
          )}
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {proposal.courseTitle}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Diajukan oleh Mentor:{" "}
                    <span className="font-bold text-blue-600">
                      {proposal.mentorName}
                    </span>{" "}
                    • Materi asli oleh: {proposal.creatorName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-lg text-kodman-600">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                    }).format(proposal.proposedPrice)}
                  </span>
                  <span className="text-xs text-gray-500">per peserta</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded text-sm">
                <div>
                  <p className="flex items-center text-gray-700 mb-2">
                    <Calendar size={16} className="mr-2 text-gray-400" />{" "}
                    <strong>Jadwal:</strong> {proposal.proposedSchedule}
                  </p>
                  <p className="flex items-center text-gray-700">
                    <Calendar size={16} className="mr-2 text-gray-400" />{" "}
                    <strong>Mulai:</strong> {proposal.startDate}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 mb-1">
                    <strong>Revenue Share:</strong>
                  </p>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>Mentor (Pengajar): {proposal.revenueShare.mentor}%</li>
                    <li>Creator (Royalti): {proposal.revenueShare.creator}%</li>
                    <li>Platform: {proposal.revenueShare.platform}%</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50">
                  Tolak
                </button>
                <button
                  onClick={() => handleApproveProposal(proposal.id)}
                  className="px-4 py-2 bg-kodman-600 text-white rounded text-sm font-bold hover:bg-kodman-700 flex items-center"
                >
                  <Check size={16} className="mr-2" /> Approve & Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "ROLES" && (
        <div className="space-y-4">
          {roleRequests.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Tidak ada pengajuan role baru.
            </p>
          )}
          {roleRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-start gap-4"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-bold text-gray-900">{req.userName}</h3>
                  <span className="text-xs text-gray-500">{req.date}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Ingin menjadi:{" "}
                  <span className="font-bold text-purple-600">
                    {req.requestedRole}
                  </span>
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mt-3 italic">
                  &quot;{req.reason}&quot;
                </div>
                <div className="flex gap-3 mt-4">
                  <button className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50">
                    Tolak
                  </button>
                  <button
                    onClick={() => handleApproveRole(req.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700"
                  >
                    Setujui Upgrade
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

export default ProposalManager;
