import { Course, CourseStatus, CourseType } from '../types';

export interface ApiCourse {
  id: string;
  title: string;
  description?: string | null;
  instructorId?: string | null;
  instructorName?: string | null;
  price: number;
  type: string;
  status: string;
  thumbnail?: string | null;
  sessions?: number | null;
  categoryIds?: string[] | null;
  rating?: number | null; // skala 0-50 di database
  totalReviews?: number | null;
  studentsEnrolled?: number;
  finalPrice?: number;
  discountPercent?: number;
  discountEndsAt?: string | null;
  examEnabled?: boolean;
}

const PLACEHOLDER_THUMB = 'https://via.placeholder.com/640x360?text=Kursus';

export const mapApiCourse = (c: ApiCourse): Course => ({
  id: c.id,
  title: c.title,
  description: c.description ?? '',
  instructor: c.instructorName ?? '',
  instructorId: c.instructorId ?? undefined,
  price: c.price,
  finalPrice: c.finalPrice ?? c.price,
  discountPercent: c.discountPercent ?? 0,
  discountEndsAt: c.discountEndsAt ?? null,
  type: (c.type as CourseType) ?? CourseType.MANDIRI,
  status: (c.status as CourseStatus) ?? CourseStatus.PUBLISHED,
  thumbnail: c.thumbnail || PLACEHOLDER_THUMB,
  sessions: c.sessions ?? 0,
  studentsEnrolled: c.studentsEnrolled ?? 0,
  rating: (c.rating ?? 0) / 10,
  totalReviews: c.totalReviews ?? 0,
  categoryIds: c.categoryIds ?? [],
  examEnabled: c.examEnabled ?? false,
});
