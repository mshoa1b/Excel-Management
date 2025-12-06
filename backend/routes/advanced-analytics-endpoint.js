// Advanced Analytics Endpoint - Add this before module.exports in stats.js

// POST /api/stats/:businessId/advanced - Advanced Cross-Dimensional Analytics
router.post("/:businessId/advanced", authenticateToken, assertBusinessScope, async (req, res) => {
    try {
        const businessId = Number(req.params.businessId);
        const { range } = req.body || {};
        const startDate = getDateRange(range);

        // Execute all queries in parallel for performance
        const [
            resolutionRows,
            return30DaysRows,
            blockedByRows,
            returnTypeRows,
            replacementAnalysisRows,
            returnTypeResolutionRows,
            returnType30DaysRows,
            return30DaysResolutionRows,
            multipleReturnResolutionRows,
            platformReturnResolutionRows,
            issueResolutionRows,
            statusReturnTypeRows,
            oowResolutionRows,
            doneByReturnTypeRows,
            appleGoogleResolutionRows
        ] = await Promise.all([
            // 1. Resolution Breakdown
            pool.query(
                `SELECT resolution, COUNT(*)::int AS count,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage,
         COALESCE(AVG(refund_amount), 0)::float AS avg_refund
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND resolution IS NOT NULL AND resolution != 'Choose' AND resolution != ''
         GROUP BY resolution ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 2. Return within 30 Days Analysis
            pool.query(
                `SELECT return_within_30_days, COUNT(*)::int AS count,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage,
         COALESCE(AVG(refund_amount), 0)::float AS avg_refund,
         COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved_count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
         GROUP BY return_within_30_days`,
                [businessId, startDate]
            ),

            // 3. Blocked By Analysis
            pool.query(
                `SELECT blocked_by, COUNT(*)::int AS count,
         COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 0)::float AS avg_blocked_days
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND blocked_by IS NOT NULL AND blocked_by != 'Choose' AND blocked_by != ''
         GROUP BY blocked_by ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 4. Return Type Breakdown
            pool.query(
                `SELECT return_type, COUNT(*)::int AS count,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage,
         COALESCE(SUM(refund_amount), 0)::float AS total_refund
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND return_type IS NOT NULL AND return_type != 'Choose' AND return_type != ''
         GROUP BY return_type ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 5. Replacement Analysis
            pool.query(
                `SELECT replacement_available, COUNT(*)::int AS count,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND LOWER(return_type) LIKE '%replacement%'
         GROUP BY replacement_available`,
                [businessId, startDate]
            ),

            // 6. Return Type + Resolution
            pool.query(
                `SELECT return_type, resolution, COUNT(*)::int AS count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND return_type != 'Choose' AND resolution != 'Choose'
         GROUP BY return_type, resolution ORDER BY count DESC LIMIT 20`,
                [businessId, startDate]
            ),

            // 7. Return Type + Return within 30 Days
            pool.query(
                `SELECT return_type, return_within_30_days, COUNT(*)::int AS count,
         COALESCE(AVG(refund_amount), 0)::float AS avg_refund
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2 AND return_type != 'Choose'
         GROUP BY return_type, return_within_30_days ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 8. Return within 30 Days + Resolution
            pool.query(
                `SELECT return_within_30_days, resolution, COUNT(*)::int AS count,
         ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2)::float AS percentage
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2 AND resolution != 'Choose'
         GROUP BY return_within_30_days, resolution ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 9. Multiple Return + Resolution
            pool.query(
                `SELECT multiple_return, resolution, COUNT(*)::int AS count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND multiple_return != 'Choose' AND resolution != 'Choose'
         GROUP BY multiple_return, resolution ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 10. Platform + Return Type + Resolution
            pool.query(
                `SELECT platform, return_type, resolution, COUNT(*)::int AS count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND platform IS NOT NULL AND return_type != 'Choose' AND resolution != 'Choose'
         GROUP BY platform, return_type, resolution ORDER BY count DESC LIMIT 20`,
                [businessId, startDate]
            ),

            // 11. Issue + Resolution
            pool.query(
                `SELECT issue, resolution, COUNT(*)::int AS count,
         COALESCE(AVG(refund_amount), 0)::float AS avg_refund
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND issue != 'Choose' AND resolution != 'Choose'
         GROUP BY issue, resolution ORDER BY count DESC LIMIT 20`,
                [businessId, startDate]
            ),

            // 12. Status + Return Type
            pool.query(
                `SELECT status, return_type, COUNT(*)::int AS count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2 AND return_type != 'Choose'
         GROUP BY status, return_type ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 13. Out of Warranty + Resolution
            pool.query(
                `SELECT out_of_warranty, resolution, COUNT(*)::int AS count,
         COALESCE(SUM(refund_amount), 0)::float AS total_refund
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2 AND resolution != 'Choose'
         GROUP BY out_of_warranty, resolution ORDER BY count DESC`,
                [businessId, startDate]
            ),

            // 14. Done By + Return Type
            pool.query(
                `SELECT done_by, return_type, COUNT(*)::int AS count,
         ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 1)::float AS avg_days
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND done_by != 'Choose' AND return_type != 'Choose'
         GROUP BY done_by, return_type ORDER BY count DESC LIMIT 20`,
                [businessId, startDate]
            ),

            // 15. Apple/Google ID + Resolution
            pool.query(
                `SELECT apple_google_id, resolution, COUNT(*)::int AS count
         FROM sheets
         WHERE business_id = $1 AND date_received >= $2
           AND apple_google_id != 'Choose' AND resolution != 'Choose'
         GROUP BY apple_google_id, resolution ORDER BY count DESC`,
                [businessId, startDate]
            )
        ]);

        res.json({
            resolutionBreakdown: resolutionRows.rows,
            return30DaysAnalysis: return30DaysRows.rows,
            blockedByAnalysis: blockedByRows.rows,
            returnTypeBreakdown: returnTypeRows.rows,
            replacementAnalysis: replacementAnalysisRows.rows,
            returnTypeResolution: returnTypeResolutionRows.rows,
            returnType30Days: returnType30DaysRows.rows,
            return30DaysResolution: return30DaysResolutionRows.rows,
            multipleReturnResolution: multipleReturnResolutionRows.rows,
            platformReturnResolution: platformReturnResolutionRows.rows,
            issueResolution: issueResolutionRows.rows,
            statusReturnType: statusReturnTypeRows.rows,
            oowResolution: oowResolutionRows.rows,
            doneByReturnType: doneByReturnTypeRows.rows,
            appleGoogleResolution: appleGoogleResolutionRows.rows,
            range: range || "1m"
        });
    } catch (err) {
        console.error("POST /api/stats/:businessId/advanced error:", err);
        res.status(500).json({ message: "Failed to fetch advanced stats" });
    }
});
