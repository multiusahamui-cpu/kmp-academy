
import { successResponse, errorResponse } from "../utils/response";
import { db } from "../db";
import { courses } from "../schema/schema";
import { eq, desc, sql } from "drizzle-orm";

// --- PUBLIC / STUDENT ---

export const getCourses = async (_req: any, res: any) => {
  try {
    const rows = await db.select({
        course: courses,
        studentsEnrolled: sql<number>`(SELECT count(*)::int FROM academy.enrollments e WHERE e.course_id = ${courses.id})`,
    })
    .from(courses)
    .where(eq(courses.status, "PUBLISHED"))
    .orderBy(desc(courses.createdAt));
    successResponse(res, rows.map((r) => ({ ...r.course, studentsEnrolled: r.studentsEnrolled })), "List of courses");
  } catch (error) {
    errorResponse(res, "Failed to fetch courses", 500, error);
  }
};

export const getCategories = async (req: any, res: any) => {
  try {
    successResponse(res, [], "List of categories");
  } catch (error) {
    errorResponse(res, "Failed to fetch categories", 500, error);
  }
};

export const getCourseDetails = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    successResponse(res, { id, title: "Mock Course" }, "Course details");
  } catch (error) {
    errorResponse(res, "Failed to fetch course details", 500, error);
  }
};

// --- CREATOR ---

export const getCreatorCourses = async (req: any, res: any) => {
  try {
    // Return courses created by this user
    successResponse(res, [], "Creator Courses");
  } catch (error) {
    errorResponse(res, "Failed to fetch courses", 500, error);
  }
};

export const createCourse = async (req: any, res: any) => {
  successResponse(res, { id: "new-course-id" }, "Course created successfully", 201);
};

export const updateCourse = async (req: any, res: any) => {
  successResponse(res, { id: req.params.id }, "Course updated");
};

export const requestPublish = async (req: any, res: any) => {
  try {
    const { id: _id } = req.params;
    // Set status to PENDING_REVIEW
    successResponse(res, null, "Publish requested");
  } catch (error) {
    errorResponse(res, "Failed to request publish", 500, error);
  }
};

export const uploadContent = async (req: any, res: any) => {
  if (!req.file) return errorResponse(res, "No file uploaded", 400);
  const fileUrl = `${req.protocol}://${req.get('host')}/cdn/${req.file.filename}`;
  successResponse(res, { url: fileUrl }, "File uploaded successfully");
};

export const addModule = async (req: any, res: any) => {
  successResponse(res, null, "Module added");
};
