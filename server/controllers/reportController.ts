// Laporan dan statistik nyata untuk Admin, Direktur, dan Creator. Semua angka dihitung dari tabel, tanpa data contoh.
// Penjualan kursus = baris enrollments dengan amount_paid (salinan harga yang dibayar saat mendaftar), apa pun kanalnya.
// Zona waktu laporan: Asia/Jakarta (WIB). Kolom timestamp disimpan UTC.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { successResponse, errorResponse } from "../utils/response";
import { getConfigInt } from "../lib/system-config";

const rowsOf = <T>(r: any): T[] => (r?.rows ?? r) as T[];
const run = async <T>(q: ReturnType<typeof sql>): Promise<T[]> => rowsOf<T>(await db.execute(q));

/** Awal bulan berjalan menurut WIB, sebagai timestamptz. */
const MONTH_START = sql`(date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')`;
/** enrolled_at disimpan UTC (timestamp tanpa zona) -> timestamptz */
const ENR_AT = sql`(e.enrolled_at at time zone 'UTC')`;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Kunci bulan YYYY-MM untuk n bulan terakhir (termasuk bulan ini), menurut WIB, urut lama -> baru. */
export const lastMonthKeys = (n: number, now = new Date()): { key: string; label: string }[] => {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() - i, 1));
    out.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` });
  }
  return out;
};

const num = (v: unknown): number => (v == null ? 0 : Number(v));

// ---------------------------------------------------------------------------
// Statistik ringkas (kartu Dashboard Admin dan Direktur)
// ---------------------------------------------------------------------------
export const getDashboardStats = async (_req: any, res: any) => {
  try {
    const [u] = await run<any>(sql`select
      count(*) filter (where status <> 'ARCHIVED')::int as total,
      count(*) filter (where status <> 'ARCHIVED' and (created_at at time zone 'UTC') >= ${MONTH_START})::int as new_month
      from academy.users`);
    const roles = await run<any>(sql`select role::text as role, count(*)::int as n from academy.users where status <> 'ARCHIVED' group by role`);
    const courseRows = await run<any>(sql`select status::text as status, count(*)::int as n from academy.courses group by status`);
    const [s] = await run<any>(sql`select
      coalesce(sum(e.amount_paid), 0)::bigint as total,
      coalesce(sum(e.amount_paid) filter (where ${ENR_AT} >= ${MONTH_START}), 0)::bigint as month,
      count(*) filter (where ${ENR_AT} >= ${MONTH_START})::int as enroll_month
      from academy.enrollments e`);
    const [q] = await run<any>(sql`select
      (select count(*)::int from academy.payment_orders where status = 'VERIFYING') as pending_payments,
      (select count(*)::int from academy.account_deletion_requests where status = 'PENDING') as open_deletions,
      (select count(*)::int from academy.role_applications where status = 'PENDING') as pending_applications,
      (select count(*)::int from academy.courses where status = 'PENDING_REVIEW') as pending_reviews`);
    const byStatus = Object.fromEntries(courseRows.map((r) => [r.status, num(r.n)]));
    successResponse(res, {
      users: { total: num(u?.total), newThisMonth: num(u?.new_month), byRole: Object.fromEntries(roles.map((r) => [r.role, num(r.n)])) },
      courses: { published: byStatus.PUBLISHED ?? 0, pendingReview: byStatus.PENDING_REVIEW ?? 0, draft: byStatus.DRAFT ?? 0, rejected: byStatus.REJECTED ?? 0 },
      sales: { revenueTotal: num(s?.total), revenueThisMonth: num(s?.month), enrollmentsThisMonth: num(s?.enroll_month) },
      queue: { pendingPayments: num(q?.pending_payments), openDeletions: num(q?.open_deletions), pendingApplications: num(q?.pending_applications), pendingReviews: num(q?.pending_reviews) },
      uptimeSeconds: Math.floor(process.uptime()),
    }, "Statistik");
  } catch (error) {
    errorResponse(res, "Gagal memuat statistik", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Keuangan
// ---------------------------------------------------------------------------
const SALES_PAGE = 20;

export const getFinanceSummary = async (_req: any, res: any) => {
  try {
    const [s] = await run<any>(sql`select
      coalesce(sum(e.amount_paid), 0)::bigint as revenue_total,
      coalesce(sum(e.amount_paid) filter (where ${ENR_AT} >= ${MONTH_START}), 0)::bigint as revenue_month,
      coalesce(sum(greatest(coalesce(e.base_price, 0) - coalesce(e.amount_paid, 0), 0)), 0)::bigint as discount_total,
      count(*) filter (where coalesce(e.amount_paid, 0) = 0)::int as free_count,
      count(*)::int as sales_count,
      coalesce(sum(e.creator_share), 0)::bigint as creator_share_total,
      coalesce(sum(e.platform_share), 0)::bigint as platform_share_total,
      coalesce(sum(e.mentor_share), 0)::bigint as mentor_share_total,
      coalesce(sum(e.platform_share) filter (where ${ENR_AT} >= ${MONTH_START}), 0)::bigint as platform_share_month
      from academy.enrollments e`);
    const [p] = await run<any>(sql`select
      coalesce(sum(amount) filter (where kind = 'TOPUP' and status = 'PAID'), 0)::bigint as topup_total,
      coalesce(sum(amount) filter (where status = 'VERIFYING'), 0)::bigint as verifying_amount,
      count(*) filter (where status = 'VERIFYING')::int as verifying_count
      from academy.payment_orders`);
    successResponse(res, {
      revenueTotal: num(s?.revenue_total), revenueThisMonth: num(s?.revenue_month), discountTotal: num(s?.discount_total),
      freeEnrollments: num(s?.free_count), salesCount: num(s?.sales_count),
      creatorShareTotal: num(s?.creator_share_total), platformShareTotal: num(s?.platform_share_total), mentorShareTotal: num(s?.mentor_share_total), platformShareThisMonth: num(s?.platform_share_month),
      creatorSharePercent: await getConfigInt("creator_share_percent"),
      topupTotal: num(p?.topup_total), verifyingAmount: num(p?.verifying_amount), verifyingCount: num(p?.verifying_count),
    }, "Ringkasan keuangan");
  } catch (error) {
    errorResponse(res, "Gagal memuat ringkasan keuangan", 500, error);
  }
};

const salesQuery = (q: string, limit: number, offset: number) => {
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const where = q ? sql`where (u.name ilike ${like} or c.title ilike ${like})` : sql``;
  return sql`select e.id, e.enrolled_at as at, u.name as buyer, c.title as course, e.base_price, e.discount_percent, e.amount_paid,
      coalesce(po.method, case when coalesce(e.amount_paid, 0) = 0 then 'GRATIS' else 'DOMPET' end) as channel
    from academy.enrollments e
    join academy.users u on u.id = e.user_id
    join academy.courses c on c.id = e.course_id
    left join academy.payment_orders po on po.enrollment_id = e.id
    ${where}
    order by e.enrolled_at desc nulls last
    limit ${limit} offset ${offset}`;
};

export const getFinanceSales = async (req: any, res: any) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const page = Math.max(1, Math.min(10_000, Number(req.query.page) || 1));
    const rows = await run<any>(salesQuery(q, SALES_PAGE + 1, (page - 1) * SALES_PAGE));
    successResponse(res, { rows: rows.slice(0, SALES_PAGE), hasMore: rows.length > SALES_PAGE, page }, "Penjualan");
  } catch (error) {
    errorResponse(res, "Gagal memuat penjualan", 500, error);
  }
};

/** Sel CSV aman: mencegah rumus spreadsheet (=, +, -, @) dan memberi tanda kutip. */
export const csvCell = (v: unknown): string => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportFinanceSales = async (_req: any, res: any) => {
  try {
    const rows = await run<any>(salesQuery("", 50_000, 0));
    const head = ["Tanggal", "Pembeli", "Kursus", "Harga dasar", "Diskon (%)", "Dibayar", "Kanal"];
    const lines = [head.map(csvCell).join(",")];
    for (const r of rows) {
      lines.push([r.at ? new Date(r.at).toISOString() : "", r.buyer, r.course, r.base_price, r.discount_percent, r.amount_paid, r.channel].map(csvCell).join(","));
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="penjualan-kursus.csv"');
    res.status(200).send("﻿" + lines.join("\r\n"));
  } catch (error) {
    errorResponse(res, "Gagal mengekspor penjualan", 500, error);
  }
};

/** Pencairan saldo akun yang ditutup (bukti transfer sudah ada). Bagi hasil Creator belum ditetapkan, jadi belum ada di sini. */
export const getSettlements = async (_req: any, res: any) => {
  try {
    const rows = await run<any>(sql`select s.id, s.amount, s.transfer_date, s.bank_ref, s.note, s.settled_by_name, s.created_at, u.name as recipient
      from academy.balance_settlements s join academy.users u on u.id = s.user_id order by s.created_at desc limit 200`);
    successResponse(res, rows, "Pencairan saldo");
  } catch (error) {
    errorResponse(res, "Gagal memuat pencairan", 500, error);
  }
};

/** Batch kode voucher/promo massal lintas kursus. Pembuatan memakai endpoint kode massal kursus yang sudah ada. */
export const getVoucherBatches = async (_req: any, res: any) => {
  try {
    const rows = await run<any>(sql`select d.batch_id as id, min(c.id::text) as course_id, min(c.title) as course_title,
        count(*)::int as total_codes, coalesce(sum(d.redemption_count), 0)::int as used_codes,
        max(d.percent)::int as percent, min(d.starts_at) as starts_at, max(d.ends_at) as ends_at, min(d.created_at) as created_at,
        min(u.name) as created_by, min(d.reason) as reason,
        bool_and(d.cancelled_at is not null) as cancelled
      from academy.course_discounts d
      join academy.courses c on c.id = d.course_id
      join academy.users u on u.id = d.created_by
      where d.batch_id is not null
      group by d.batch_id order by min(d.created_at) desc limit 100`);
    successResponse(res, rows, "Batch voucher");
  } catch (error) {
    errorResponse(res, "Gagal memuat batch voucher", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Laporan strategis (Direktur)
// ---------------------------------------------------------------------------
export const buildStrategicReport = async (months = 6) => {
  const keys = lastMonthKeys(months);
  const rev = await run<any>(sql`select to_char(date_trunc('month', ${ENR_AT} at time zone 'Asia/Jakarta'), 'YYYY-MM') as m,
      coalesce(sum(e.amount_paid), 0)::bigint as revenue, count(*)::int as enrollments
    from academy.enrollments e where ${ENR_AT} >= ${MONTH_START} - ${sql.raw(`interval '${months - 1} months'`)} group by 1`);
  const usr = await run<any>(sql`select to_char(date_trunc('month', (created_at at time zone 'UTC') at time zone 'Asia/Jakarta'), 'YYYY-MM') as m, count(*)::int as n
    from academy.users where status <> 'ARCHIVED' and (created_at at time zone 'UTC') >= ${MONTH_START} - ${sql.raw(`interval '${months - 1} months'`)} group by 1`);
  const [{ total_users }] = await run<any>(sql`select count(*)::int as total_users from academy.users where status <> 'ARCHIVED'`);
  const revBy = new Map(rev.map((r) => [r.m, r]));
  const usrBy = new Map(usr.map((r) => [r.m, num(r.n)]));
  const monthly = keys.map((k) => ({ month: k.key, label: k.label, revenue: num(revBy.get(k.key)?.revenue), enrollments: num(revBy.get(k.key)?.enrollments), newUsers: usrBy.get(k.key) ?? 0 }));
  const byType = await run<any>(sql`select c.type::text as type, coalesce(sum(e.amount_paid), 0)::bigint as revenue, count(*)::int as enrollments
    from academy.enrollments e join academy.courses c on c.id = e.course_id group by c.type order by 2 desc`);
  const topCourses = await run<any>(sql`select c.id, c.title, c.instructor_name, count(e.id)::int as students, coalesce(sum(e.amount_paid), 0)::bigint as revenue, c.rating, c.total_reviews
    from academy.courses c left join academy.enrollments e on e.course_id = c.id where c.status = 'PUBLISHED'
    group by c.id order by students desc, revenue desc limit 5`);
  const topCreators = await run<any>(sql`select u.id, u.name, count(distinct c.id)::int as courses, count(e.id)::int as students, coalesce(sum(e.amount_paid), 0)::bigint as revenue
    from academy.users u join academy.courses c on c.instructor_id = u.id and c.status = 'PUBLISHED'
    left join academy.enrollments e on e.course_id = c.id group by u.id order by revenue desc, students desc limit 5`);
  return {
    monthly,
    totals: { users: num(total_users), revenue: monthly.reduce((a, m) => a + m.revenue, 0), enrollments: monthly.reduce((a, m) => a + m.enrollments, 0) },
    revenueByType: byType.map((r) => ({ type: r.type, revenue: num(r.revenue), enrollments: num(r.enrollments) })),
    topCourses: topCourses.map((r) => ({ id: r.id, title: r.title, instructor: r.instructor_name, students: num(r.students), revenue: num(r.revenue), rating: num(r.rating) / 10, totalReviews: num(r.total_reviews) })),
    topCreators: topCreators.map((r) => ({ id: r.id, name: r.name, courses: num(r.courses), students: num(r.students), revenue: num(r.revenue) })),
  };
};

export const getStrategicReport = async (_req: any, res: any) => {
  try {
    successResponse(res, await buildStrategicReport(6), "Laporan strategis");
  } catch (error) {
    errorResponse(res, "Gagal memuat laporan strategis", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Kontrol kualitas (Direktur)
// ---------------------------------------------------------------------------
export const LOW_RATING_MAX = 3.5; // di bawah ini dianggap perlu ditinjau
export const LOW_RATING_MIN_REVIEWS = 3; // minimal ulasan agar rating bermakna

export const getQuality = async (_req: any, res: any) => {
  try {
    const low = await run<any>(sql`select c.id, c.title, c.instructor_name, c.rating, c.total_reviews,
        (select count(*)::int from academy.enrollments e where e.course_id = c.id) as students
      from academy.courses c
      where c.status = 'PUBLISHED' and c.total_reviews >= ${LOW_RATING_MIN_REVIEWS} and c.rating < ${LOW_RATING_MAX * 10}
      order by c.rating asc, c.total_reviews desc limit 20`);
    const bad = await run<any>(sql`select r.id, r.rating, r.comment, r.created_at, c.title as course, u.name as author
      from academy.reviews r join academy.courses c on c.id = r.course_id join academy.users u on u.id = r.user_id
      where r.rating <= 2 and r.comment is not null and length(trim(r.comment)) > 0 order by r.created_at desc limit 20`);
    const [avg] = await run<any>(sql`select coalesce(sum(rating * total_reviews)::float / nullif(sum(total_reviews), 0), 0) as x10, coalesce(sum(total_reviews), 0)::int as n
      from academy.courses where status = 'PUBLISHED' and total_reviews > 0`);
    successResponse(res, {
      threshold: LOW_RATING_MAX, minReviews: LOW_RATING_MIN_REVIEWS,
      averageRating: num(avg?.x10) / 10, totalReviews: num(avg?.n),
      lowRatedCourses: low.map((r) => ({ id: r.id, title: r.title, instructor: r.instructor_name, rating: num(r.rating) / 10, totalReviews: num(r.total_reviews), students: num(r.students) })),
      lowReviews: bad.map((r) => ({ id: r.id, rating: num(r.rating), comment: r.comment, createdAt: r.created_at, course: r.course, author: r.author })),
    }, "Kontrol kualitas");
  } catch (error) {
    errorResponse(res, "Gagal memuat kontrol kualitas", 500, error);
  }
};

// ---------------------------------------------------------------------------
// Ringkasan Creator
// ---------------------------------------------------------------------------
export const getCreatorSummary = async (req: any, res: any) => {
  try {
    const uid = req.user.id as string;
    const [s] = await run<any>(sql`select
      coalesce(sum(e.amount_paid), 0)::bigint as total,
      coalesce(sum(e.amount_paid) filter (where ${ENR_AT} >= ${MONTH_START}), 0)::bigint as month,
      count(distinct e.user_id)::int as students,
      coalesce(sum(e.creator_share), 0)::bigint as earn_total,
      coalesce(sum(e.creator_share) filter (where ${ENR_AT} >= ${MONTH_START}), 0)::bigint as earn_month
      from academy.enrollments e join academy.courses c on c.id = e.course_id where c.instructor_id = ${uid}`);
    const [r] = await run<any>(sql`select coalesce(sum(rating * total_reviews)::float / nullif(sum(total_reviews), 0), 0) as x10, coalesce(sum(total_reviews), 0)::int as n
      from academy.courses where instructor_id = ${uid} and total_reviews > 0`);
    const content = await run<any>(sql`select id, title, status::text as status, updated_at from academy.courses where instructor_id = ${uid} order by updated_at desc nulls last limit 5`);
    const days = await run<any>(sql`select to_char(((e.enrolled_at at time zone 'UTC') at time zone 'Asia/Jakarta')::date, 'YYYY-MM-DD') as d, coalesce(sum(e.amount_paid), 0)::bigint as revenue
      from academy.enrollments e join academy.courses c on c.id = e.course_id
      where c.instructor_id = ${uid} and ${ENR_AT} >= now() - interval '7 days' group by 1`);
    const wib = new Date(Date.now() + 7 * 3600_000);
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - (6 - i)));
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: num(days.find((x) => x.d === key)?.revenue) };
    });
    successResponse(res, {
      salesTotal: num(s?.total), salesThisMonth: num(s?.month), students: num(s?.students),
      earningsTotal: num(s?.earn_total), earningsThisMonth: num(s?.earn_month), sharePercent: await getConfigInt("creator_share_percent"),
      averageRating: num(r?.x10) / 10, totalReviews: num(r?.n),
      content: content.map((c) => ({ id: c.id, title: c.title, status: c.status, updatedAt: c.updated_at })),
      last7Days: last7,
    }, "Ringkasan Creator");
  } catch (error) {
    errorResponse(res, "Gagal memuat ringkasan", 500, error);
  }
};
