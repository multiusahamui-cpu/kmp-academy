import api from './api';

export interface TalentCard { slug: string; name: string; avatar: string | null; headline: string; city: string | null; skills: string[] }
export interface TalentCert { serial: string; courseTitle: string; courseType: string; kind: 'EXAM' | 'COMPLETION' | 'PARTICIPATION'; grade: number | null; issuedAt: string }
export interface TalentPublic extends TalentCard {
  bio: string; linkedinUrl: string | null; portfolioUrl: string | null;
  certificates: TalentCert[]; completedCourses: { title: string; type: string; completedAt: string | null }[];
}
export interface MyTalent {
  profile: { slug: string; headline: string; bio: string; city: string; skills: string[]; linkedinUrl: string; portfolioUrl: string; isPublic: boolean } | null;
  kycOk: boolean; consentVersion: string; consentText: string;
}
export interface TalentForm { headline: string; bio: string; city: string; skills: string; linkedinUrl: string; portfolioUrl: string }

export const talentApi = {
  directory: async (q: string, page: number) => (await api.get('/talent', { params: { q, page } })).data.data as { items: TalentCard[]; hasMore: boolean; page: number },
  profile: async (slug: string) => (await api.get(`/talent/${encodeURIComponent(slug)}`)).data.data as TalentPublic,
  inquire: async (slug: string, b: { senderName: string; company: string; senderEmail: string; message: string }) => { await api.post(`/talent/${encodeURIComponent(slug)}/inquiries`, b); },
  mine: async () => (await api.get('/talent/me')).data.data as MyTalent,
  save: async (f: TalentForm, isPublic: boolean, consent: boolean) => {
    await api.put('/talent/me', { ...f, skills: f.skills.split(','), isPublic, consent });
  },
  hide: async () => { await api.post('/talent/me/hide'); },
};
