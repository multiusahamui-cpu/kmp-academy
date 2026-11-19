import api from './api';

export interface MentorClassRow { id: string; name: string; description: string | null; joinCode: string; archived: boolean; createdAt: string; members: number; nextSession: string | null }
export interface ClassMember { userId: string; name: string; email: string; joinedAt: string; grade: number | null; gradeNote: string | null; gradedAt: string | null }
export interface ClassSession { id: string; title: string; startsAt: string; meetingUrl: string | null }
export interface ClassDetail { class: MentorClassRow; members: ClassMember[]; sessions: ClassSession[] }
export interface MyClass {
  id: string; name: string; description: string | null; archived: boolean; mentor: string; grade: number | null; gradeNote: string | null;
  sessions: (ClassSession & { classId: string })[];
}

export const classesApi = {
  list: async () => (await api.get('/mentor/classes')).data.data as MentorClassRow[],
  create: async (body: { name: string; description: string }) => (await api.post('/mentor/classes', body)).data.data as { id: string },
  get: async (id: string) => (await api.get(`/mentor/classes/${id}`)).data.data as ClassDetail,
  update: async (id: string, body: { name: string; description: string; archived?: boolean }) => { await api.put(`/mentor/classes/${id}`, body); },
  newCode: async (id: string) => (await api.post(`/mentor/classes/${id}/code`)).data.data as { joinCode: string },
  addMember: async (id: string, email: string) => { await api.post(`/mentor/classes/${id}/members`, { email }); },
  removeMember: async (id: string, userId: string) => { await api.delete(`/mentor/classes/${id}/members/${userId}`); },
  grade: async (id: string, userId: string, grade: number, note: string) => { await api.put(`/mentor/classes/${id}/members/${userId}/grade`, { grade, note }); },
  addSession: async (id: string, body: { title: string; startsAt: string; meetingUrl: string }) => { await api.post(`/mentor/classes/${id}/sessions`, body); },
  deleteSession: async (id: string, sessionId: string) => { await api.delete(`/mentor/classes/${id}/sessions/${sessionId}`); },
  mine: async () => (await api.get('/classes/mine')).data.data as MyClass[],
  join: async (code: string) => (await api.post('/classes/join', { code })).data.data as { id: string; name: string },
};

export const apiMessage = (e: any, fallback: string): string => e?.response?.data?.message ?? fallback;
