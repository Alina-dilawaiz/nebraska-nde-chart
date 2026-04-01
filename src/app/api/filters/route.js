import pool from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const [grades, districts] = await Promise.all([
            pool.query(`
                SELECT DISTINCT grade
                FROM math_scores
                WHERE grade != 'ALL'
                ORDER BY grade
            `),
            pool.query(`
                SELECT DISTINCT agency_name
                FROM math_scores
                WHERE level = 'DI'
                ORDER BY agency_name
            `)
        ])

        return NextResponse.json({
            grades   : grades.rows.map(r => r.grade),
            districts: districts.rows.map(r => r.agency_name),
        })

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}