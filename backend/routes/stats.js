// routes/stats.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE } = require("../lib/roles");

// If range is omitted or invalid, default to last 1 month
const getDateRange = (range) => {
  const today = new Date(); // local time ok since we only need YYYY-MM-DD
  const d = new Date(today);
  switch ((range || "").toLowerCase()) {
    case "1d":
      d.setDate(today.getDate() - 1);
      break;
    case "1w":
      d.setDate(today.getDate() - 7);
      break;
    case "1m":
      d.setMonth(today.getMonth() - 1);
      break;
    case "3m":
      d.setMonth(today.getMonth() - 3);
      break;
    case "6m":
      d.setMonth(today.getMonth() - 6);
      break;
    case "1y":
      d.setFullYear(today.getFullYear() - 1);
      break;
    default:
      d.setMonth(today.getMonth() - 1);
      break;
  }
  return d.toISOString().split("T")[0];
};

function assertBusinessScope(req, res, next) {
  const paramBiz = Number(req.params.businessId);
  if (!paramBiz || Number.isNaN(paramBiz)) {
    return res.status(400).json({ message: "Invalid businessId" });
  }
  const myRole = req.user?.role_id;
  const myBiz = req.user?.business_id;

  if (myRole === ROLE.SUPER_ADMIN) return next();
  if (myBiz !== paramBiz) return res.status(403).json({ message: "Forbidden" });
  return next();
}

// POST /api/stats/:businessId - Enhanced Overview Stats
router.post("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*)::int                          AS total_orders,
        COALESCE(SUM(refund_amount), 0)::float AS total_refund,
        COALESCE(AVG(refund_amount), 0)::float AS avg_refund,
        COUNT(DISTINCT order_no)::int          AS unique_orders,
        COUNT(*) FILTER (WHERE return_within_30_days = 'Yes')::int AS orders_within_30_days,
        COUNT(*) FILTER (WHERE out_of_warranty = 'Yes')::int AS out_of_warranty_returns,
        COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_orders,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress_orders,
        COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved_orders,
        COUNT(*) FILTER (WHERE multiple_return IN ('2nd Time', '3rd Time'))::int AS multiple_returns,
        COUNT(*) FILTER (WHERE LOWER(return_type) LIKE '%replacement%' AND replacement_available = 'Yes')::int AS replacement_available_count,
        COUNT(*) FILTER (WHERE LOWER(return_type) LIKE '%replacement%' AND replacement_available = 'No')::int AS replacement_unavailable_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'Resolved'), 0)::float AS average_resolution_time
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2
      `,
      [businessId, startDate]
    );

    const r = rows[0] || {
      total_orders: 0,
      total_refund: 0,
      avg_refund: 0,
      unique_orders: 0,
      orders_within_30_days: 0,
      out_of_warranty_returns: 0,
      pending_orders: 0,
      in_progress_orders: 0,
      resolved_orders: 0,
      multiple_returns: 0,
      replacement_available_count: 0,
      replacement_unavailable_count: 0,
      average_resolution_time: 0
    };

    res.json({
      totalOrders: r.total_orders,
      totalRefundAmount: r.total_refund,
      averageRefundAmount: r.avg_refund,
      uniqueOrders: r.unique_orders,
      ordersWithin30Days: r.orders_within_30_days,
      outOfWarrantyReturns: r.out_of_warranty_returns,
      pendingOrders: r.pending_orders,
      inProgressOrders: r.in_progress_orders,
      resolvedOrders: r.resolved_orders,
      multipleReturns: r.multiple_returns,
      replacementAvailableCount: r.replacement_available_count,
      replacementUnavailableCount: r.replacement_unavailable_count,
      averageResolutionTime: r.average_resolution_time,
      range: range || "1m",
      startDate
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// POST /api/stats/:businessId/platforms - Platform Comparison
router.post("/:businessId/platforms", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    const { rows } = await pool.query(
      `
      SELECT
        platform,
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(refund_amount), 0)::float AS total_refunds,
        COALESCE(AVG(refund_amount), 0)::float AS avg_refund
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2 AND platform IS NOT NULL
      GROUP BY platform
      ORDER BY total_orders DESC
      `,
      [businessId, startDate]
    );

    res.json({
      platforms: rows,
      range: range || "1m"
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId/platforms error:", err);
    res.status(500).json({ message: "Failed to fetch platform stats" });
  }
});

// POST /api/stats/:businessId/issues - Issue Analytics
router.post("/:businessId/issues", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    // Top issues
    const { rows: topIssuesRows } = await pool.query(
      `
      SELECT
        issue,
        COUNT(*)::int AS count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage
      FROM sheets
      WHERE business_id = $1 
        AND date_received >= $2
        AND issue IS NOT NULL
        AND issue != 'Choose'
        AND issue != ''
      GROUP BY issue
      ORDER BY count DESC
      LIMIT 10
      `,
      [businessId, startDate]
    );

    // Lock issues
    const { rows: lockRows } = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%passcode%')::int AS passcode_count,
        COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%apple%id%' OR LOWER(issue) LIKE '%icloud%')::int AS apple_id_count,
        COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%google%' OR LOWER(issue) LIKE '%frp%')::int AS google_id_count
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2
      `,
      [businessId, startDate]
    );

    // Status distribution
    const { rows: statusRows } = await pool.query(
      `
      SELECT
        status,
        COUNT(*)::int AS count
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2
      GROUP BY status
      `,
      [businessId, startDate]
    );

    res.json({
      topIssues: topIssuesRows,
      lockIssues: lockRows[0] || { passcode_count: 0, apple_id_count: 0, google_id_count: 0 },
      statusDistribution: statusRows,
      range: range || "1m"
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId/issues error:", err);
    res.status(500).json({ message: "Failed to fetch issue stats" });
  }
});

// POST /api/stats/:businessId/products - Product Analytics
router.post("/:businessId/products", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    // Top returned SKUs
    const { rows: skuRows } = await pool.query(
      `
      SELECT
        sku,
        COUNT(*)::int AS return_count,
        COALESCE(SUM(refund_amount), 0)::float AS total_refund
      FROM sheets
      WHERE business_id = $1 
        AND date_received >= $2
        AND sku IS NOT NULL
        AND sku != ''
      GROUP BY sku
      ORDER BY return_count DESC
      LIMIT 10
      `,
      [businessId, startDate]
    );

    // IMEI tracking (multiple returns)
    const { rows: imeiRows } = await pool.query(
      `
      SELECT
        imei,
        COUNT(*)::int AS return_count
      FROM sheets
      WHERE business_id = $1 
        AND date_received >= $2
        AND imei IS NOT NULL
        AND imei != ''
      GROUP BY imei
      HAVING COUNT(*) > 1
      ORDER BY return_count DESC
      LIMIT 10
      `,
      [businessId, startDate]
    );

    res.json({
      topReturnedSKUs: skuRows,
      multipleReturnIMEIs: imeiRows,
      range: range || "1m"
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId/products error:", err);
    res.status(500).json({ message: "Failed to fetch product stats" });
  }
});

// POST /api/stats/:businessId/agents - Agent Performance
router.post("/:businessId/agents", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    // Agent performance
    const { rows: agentRows } = await pool.query(
      `
      SELECT
        done_by AS agent,
        COUNT(*)::int AS cases_handled,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 1)::float AS avg_resolution_days,
        ROUND((COUNT(*) FILTER (WHERE status = 'Resolved') * 100.0 / NULLIF(COUNT(*), 0)), 1)::float AS resolution_rate
      FROM sheets
      WHERE business_id = $1 
        AND date_received >= $2
        AND done_by IS NOT NULL
        AND done_by != 'Choose'
        AND done_by != ''
      GROUP BY done_by
      ORDER BY cases_handled DESC
      `,
      [businessId, startDate]
    );

    // Blocked cases
    const { rows: blockedRows } = await pool.query(
      `
      SELECT
        blocked_by,
        COUNT(*)::int AS count
      FROM sheets
      WHERE business_id = $1 
        AND date_received >= $2
        AND blocked_by IS NOT NULL
        AND blocked_by != 'Choose'
        AND blocked_by != ''
      GROUP BY blocked_by
      ORDER BY count DESC
      `,
      [businessId, startDate]
    );

    res.json({
      agentPerformance: agentRows,
      blockedCases: blockedRows,
      range: range || "1m"
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId/agents error:", err);
    res.status(500).json({ message: "Failed to fetch agent stats" });
  }
});

// POST /api/stats/:businessId/trends - Time Series Data
router.post("/:businessId/trends", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    const { rows } = await pool.query(
      `
      SELECT
        DATE(date_received) AS date,
        COUNT(*)::int AS orders,
        COALESCE(SUM(refund_amount), 0)::float AS refunds
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2
      GROUP BY DATE(date_received)
      ORDER BY date ASC
      `,
      [businessId, startDate]
    );

    res.json({
      daily: rows,
      range: range || "1m"
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId/trends error:", err);
    res.status(500).json({ message: "Failed to fetch trend stats" });
  }
});

// GET /api/stats/:businessId/realtime - Real-time Analytics
router.get("/:businessId/realtime", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const today = new Date().toISOString().split('T')[0];

    // Today's stats
    const { rows: todayRows } = await pool.query(
      `
      SELECT
        COUNT(*)::int AS today_orders,
        COALESCE(SUM(refund_amount), 0)::float AS today_refunds,
        COUNT(*) FILTER (WHERE status IN ('Pending', 'In Progress'))::int AS active_cases
      FROM sheets
      WHERE business_id = $1 AND DATE(date_received) = $2
      `,
      [businessId, today]
    );

    // Recent activity (last 10 updates)
    const { rows: activityRows } = await pool.query(
      `
      SELECT
        id,
        order_no,
        status,
        updated_at,
        issue
      FROM sheets
      WHERE business_id = $1
      ORDER BY updated_at DESC
      LIMIT 10
      `,
      [businessId]
    );

    const todayStats = todayRows[0] || { today_orders: 0, today_refunds: 0, active_cases: 0 };

    res.json({
      todayOrders: todayStats.today_orders,
      todayRefunds: todayStats.today_refunds,
      activeCases: todayStats.active_cases,
      recentActivity: activityRows.map(row => ({
        type: row.status,
        timestamp: row.updated_at,
        description: `Order ${row.order_no} - ${row.issue || 'No issue specified'}`
      }))
    });
  } catch (err) {
    console.error("GET /api/stats/:businessId/realtime error:", err);
    res.status(500).json({ message: "Failed to fetch realtime stats" });
  }
});

// POST /api/stats/:businessId/advanced - Advanced Cross-Dimensional Analytics
router.post("/:businessId/advanced", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    // Optimized query using CTEs for single-pass aggregation
    const { rows } = await pool.query(
      `
      WITH filtered_sheets AS (
        SELECT * FROM sheets 
        WHERE business_id = $1 AND date_received >= $2
      ),
      resolution_stats AS (
        SELECT resolution, COUNT(*)::int as count, AVG(refund_amount) as avg_refund 
        FROM filtered_sheets
        WHERE resolution IS NOT NULL AND resolution != 'Choose' AND resolution != ''
        GROUP BY resolution
      ),
      return_30_stats AS (
        SELECT return_within_30_days, COUNT(*)::int as count, AVG(refund_amount) as avg_refund
        FROM filtered_sheets
        GROUP BY return_within_30_days
      ),
      blocked_stats AS (
        SELECT blocked_by, COUNT(*)::int as count
        FROM filtered_sheets
        WHERE blocked_by IS NOT NULL AND blocked_by != 'Choose' AND blocked_by != ''
        GROUP BY blocked_by
      ),
      lock_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%passcode%' OR LOWER(issue) LIKE '%pin%')::int AS passcode_count,
          COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%apple%id%' OR LOWER(issue) LIKE '%icloud%')::int AS apple_id_count,
          COUNT(*) FILTER (WHERE LOWER(issue) LIKE '%google%' OR LOWER(issue) LIKE '%frp%')::int AS google_id_count
        FROM filtered_sheets
      ),
      status_stats AS (
        SELECT status, COUNT(*)::int as count
        FROM filtered_sheets
        WHERE status IS NOT NULL
        GROUP BY status
      ),
      return_type_stats AS (
        SELECT return_type, COUNT(*)::int as count, SUM(refund_amount) as total_refund
        FROM filtered_sheets
        WHERE return_type IS NOT NULL AND return_type != 'Choose' AND return_type != ''
        GROUP BY return_type
      ),
      replacement_stats AS (
        SELECT replacement_available, COUNT(*)::int as count
        FROM filtered_sheets
        WHERE LOWER(return_type) LIKE '%replacement%'
        GROUP BY replacement_available
      ),
      repeated_imeis AS (
        SELECT imei, COUNT(*)::int as count
        FROM filtered_sheets
        WHERE imei IS NOT NULL AND imei != ''
        GROUP BY imei
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 20
      ),
      top_issues AS (
        SELECT issue, resolution, COUNT(*)::int as count, AVG(refund_amount) as avg_refund
        FROM filtered_sheets
        WHERE issue != 'Choose' AND resolution != 'Choose'
        GROUP BY issue, resolution
        ORDER BY count DESC
        LIMIT 20
      ),
      agent_stats AS (
        SELECT done_by, COUNT(*)::int as count, SUM(refund_amount) as total_refund, AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days
        FROM filtered_sheets
        WHERE done_by != 'Choose' AND done_by != ''
        GROUP BY done_by
        ORDER BY count DESC
        LIMIT 20
      ),
      sku_stats AS (
        SELECT sku, COUNT(*)::int as count, SUM(refund_amount) as total_refund
        FROM filtered_sheets
        WHERE sku IS NOT NULL AND sku != ''
        GROUP BY sku
        ORDER BY count DESC
        LIMIT 20
      ),
      platform_stats AS (
        SELECT platform, COUNT(*)::int as count, SUM(refund_amount) as total_refund
        FROM filtered_sheets
        WHERE platform IS NOT NULL
        GROUP BY platform
        ORDER BY count DESC
      ),
      issue_stats AS (
        SELECT issue, COUNT(*)::int as count
        FROM filtered_sheets
        WHERE issue != 'Choose' AND issue != ''
        GROUP BY issue
        ORDER BY count DESC
        LIMIT 20
      ),
      daily_trends AS (
        SELECT DATE(date_received) as date, COUNT(*)::int as count, SUM(refund_amount) as total_amount
        FROM filtered_sheets
        GROUP BY DATE(date_received)
        ORDER BY date ASC
      ),
      attachment_stats AS (
        SELECT
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM attachments a WHERE a.sheet_id = s.id))::int as with_count,
          COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM attachments a WHERE a.sheet_id = s.id))::int as without_count
        FROM filtered_sheets s
      )
      SELECT
        (SELECT json_agg(json_build_object('agentName', done_by, 'count', count, 'refundAmount', COALESCE(total_refund, 0), 'avgResolutionTime', COALESCE(avg_days, 0))) FROM agent_stats) as agent_performance,
        (SELECT json_agg(json_build_object('sku', sku, 'count', count, 'refundAmount', COALESCE(total_refund, 0))) FROM sku_stats) as top_skus,
        (SELECT json_agg(json_build_object('platform', platform, 'count', count, 'refundAmount', COALESCE(total_refund, 0))) FROM platform_stats) as platform_breakdown,
        (SELECT json_agg(json_build_object('issue', issue, 'count', count, 'percentage', ROUND((count * 100.0 / (SELECT COUNT(*) FROM filtered_sheets)), 2))) FROM issue_stats) as issue_breakdown,
        (SELECT json_agg(json_build_object('resolution', resolution, 'count', count, 'percentage', ROUND((count * 100.0 / (SELECT SUM(count) FROM resolution_stats)), 2), 'avg_refund', COALESCE(avg_refund, 0))) FROM resolution_stats) as resolution_breakdown,
        (SELECT json_agg(json_build_object('return_within_30_days', return_within_30_days, 'count', count, 'percentage', ROUND((count * 100.0 / (SELECT SUM(count) FROM return_30_stats)), 2), 'avg_refund', COALESCE(avg_refund, 0))) FROM return_30_stats) as return_30_analysis,
        (SELECT json_agg(json_build_object('blocked_by', blocked_by, 'count', count)) FROM blocked_stats) as blocked_by_analysis,
        (SELECT row_to_json(lock_stats) FROM lock_stats) as lock_analysis,
        (SELECT json_agg(json_build_object('status', status, 'count', count)) FROM status_stats) as status_breakdown,
        (SELECT json_agg(json_build_object('return_type', return_type, 'count', count, 'percentage', ROUND((count * 100.0 / (SELECT SUM(count) FROM return_type_stats)), 2), 'total_refund', COALESCE(total_refund, 0))) FROM return_type_stats) as return_type_breakdown,
        (SELECT json_agg(json_build_object('replacement_available', replacement_available, 'count', count, 'percentage', ROUND((count * 100.0 / (SELECT SUM(count) FROM replacement_stats)), 2))) FROM replacement_stats) as replacement_analysis,
        (SELECT json_agg(json_build_object('imei', imei, 'count', count)) FROM repeated_imeis) as repeated_imeis,
        (SELECT json_agg(json_build_object('issue', issue, 'resolution', resolution, 'count', count, 'avg_refund', COALESCE(avg_refund, 0))) FROM top_issues) as issue_resolution,
        (SELECT json_agg(json_build_object('done_by', done_by, 'return_type', return_type, 'count', count, 'avg_days', COALESCE(avg_days, 0))) FROM agent_stats) as done_by_return_type,
        (SELECT json_agg(json_build_object('date', date, 'orders', count, 'refunds', count, 'refundAmount', COALESCE(total_amount, 0))) FROM daily_trends) as trends,
        (SELECT row_to_json(attachment_stats) FROM attachment_stats) as attachment_stats
      `,
      [businessId, startDate]
    );

    const r = rows[0] || {};

    // Fallback empty arrays if null (Postgres json_agg returns null for no rows)
    const result = {
      topSkus: r.top_skus || [],
      platformBreakdown: r.platform_breakdown || [],
      issueBreakdown: r.issue_breakdown || [],
      agentPerformance: r.agent_performance || [],
      trends: r.trends || [],
      repeatedImeis: r.repeated_imeis || [],
      // Additional useful metadata/stats
      resolutionBreakdown: r.resolution_breakdown || [],
      return30DaysAnalysis: r.return_30_analysis || [],
      blockedByAnalysis: r.blocked_by_analysis || [],
      lockAnalysis: r.lock_analysis || { passcode_count: 0, apple_id_count: 0, google_id_count: 0 },
      statusBreakdown: r.status_breakdown || [],
      returnTypeBreakdown: r.return_type_breakdown || [],
      replacementAnalysis: r.replacement_analysis || [],
      issueResolution: r.issue_resolution || [],
      doneByReturnType: r.done_by_return_type || [],
      attachmentStats: r.attachment_stats ? { with: r.attachment_stats.with_count, without: r.attachment_stats.without_count } : { with: 0, without: 0 },
      // Empty fallbacks for unused legacy fields
      returnTypeResolution: [],
      returnType30Days: [],
      return30DaysResolution: [],
      multipleReturnResolution: [],
      platformReturnResolution: [],
      statusReturnType: [],
      oowResolution: [],
      appleGoogleResolution: [],
      range: range || "1m"
    };

    res.json(result);

  } catch (err) {
    console.error("POST /api/stats/:businessId/advanced error:", err);
    res.status(500).json({ message: "Failed to fetch advanced stats" });
  }
});

module.exports = router;
