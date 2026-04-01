import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // Load both subjects in parallel
        const [mathResult, engResult] = await Promise.all([
            pool.query(`
                SELECT
                    agency_name,
                    school_year,
                    avg_scale_score,
                    count_tested,
                    subgroup_type,
                    subgroup_desc,
                    grade,
                    level
                FROM math_scores
                WHERE
                    level IN ('DI', 'ST') AND
                    grade != 'ALL' AND
                    subgroup_type IN ('ALL', 'GENDER')
                ORDER BY agency_name, school_year, grade
            `),
            pool.query(`
                SELECT
                    agency_name,
                    school_year,
                    avg_scale_score,
                    count_tested,
                    subgroup_type,
                    subgroup_desc,
                    grade,
                    level
                FROM english_scores
                WHERE
                    level IN ('DI', 'ST') AND
                    grade != 'ALL' AND
                    subgroup_type IN ('ALL', 'GENDER')
                ORDER BY agency_name, school_year, grade
            `)
        ])

        return NextResponse.json({
            math   : mathResult.rows,
            english: engResult.rows,
        })

    } catch (error) {
        console.error('DB Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}