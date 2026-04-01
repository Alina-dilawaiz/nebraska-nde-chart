'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'

const Plot = dynamic(
    () => import('react-plotly.js').then(mod => mod.default),
    { ssr: false, loading: () => <ChartSkeleton /> }
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScoreRow {
    agency_name    : string
    school_year    : string
    avg_scale_score: string
    count_tested   : string
    subgroup_type  : string
    subgroup_desc  : string
    grade          : string
    level          : string
}

interface AllData {
    math   : ScoreRow[]
    english: ScoreRow[]
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GRADES = [
    { value: '03', label: 'Grade 3' },
    { value: '04', label: 'Grade 4' },
    { value: '05', label: 'Grade 5' },
    { value: '06', label: 'Grade 6' },
    { value: '07', label: 'Grade 7' },
    { value: '08', label: 'Grade 8' },
]

const TICK_VALS  = [2018, 2019, 2021, 2022, 2023, 2024, 2025]
const TICK_TEXTS = ['2017-18','2018-19','2020-21','2021-22',
                    '2022-23','2023-24','2024-25']

const COLORS = [
    '#2563eb','#dc2626','#16a34a','#d97706','#7c3aed',
    '#0891b2','#be185d','#065f46','#92400e','#1e40af',
    '#b91c1c','#15803d','#b45309','#6d28d9','#0e7490',
    '#9d174d','#064e3b','#78350f','#3730a3','#7f1d1d',
    '#1d4ed8','#b45309','#047857','#c2410c','#6d28d9',
]

// ── Utility ───────────────────────────────────────────────────────────────────
function getYear(schoolYear: string) {
    return parseInt(schoolYear.split('-')[1])
}

function weightedAvg(scores: number[], counts: number[]) {
    const total = counts.reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    return scores.reduce((a, s, i) => a + s * counts[i], 0) / total
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ChartSkeleton() {
    return (
        <div className="h-[560px] flex items-center justify-center
                        bg-gray-50 rounded-xl">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500
                                border-t-transparent rounded-full
                                animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-medium">
                    Loading chart...
                </p>
            </div>
        </div>
    )
}

// ── Multi-Select Component ────────────────────────────────────────────────────
function MultiSelect({
    label, options, selected, onChange, placeholder, accentColor,
}: {
    label      : string
    options    : { value: string; label: string }[]
    selected   : string[]
    onChange   : (v: string[]) => void
    placeholder: string
    accentColor: string
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const toggle = (val: string) =>
        onChange(selected.includes(val)
            ? selected.filter(v => v !== val)
            : [...selected, val])

    const displayText =
        selected.length === 0             ? placeholder :
        selected.length === options.length ? `All ${label}s Selected` :
        selected.length === 1             ?
            options.find(o => o.value === selected[0])?.label || '' :
        `${selected.length} ${label}s Selected`

    return (
        <div className="relative flex-1 min-w-[160px]" ref={ref}>
            {/* Label */}
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-2">
                {label}
            </p>

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{ borderColor: accentColor }}
                className="w-full h-11 flex items-center justify-between
                           px-4 bg-white border-2 rounded-xl text-sm
                           font-medium text-gray-700 hover:bg-gray-50
                           focus:outline-none transition-all shadow-sm"
            >
                <span className="truncate text-left">{displayText}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {selected.length > 0 &&
                     selected.length < options.length && (
                        <span
                            style={{ background: accentColor }}
                            className="text-white text-[10px] font-bold
                                       w-5 h-5 rounded-full flex items-center
                                       justify-center"
                        >
                            {selected.length}
                        </span>
                    )}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform
                                    ${open ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round"
                              strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-2 w-full bg-white
                                border border-gray-200 rounded-xl
                                shadow-2xl overflow-hidden">
                    {/* Actions */}
                    <div className="flex border-b border-gray-100 bg-gray-50">
                        <button
                            onClick={() => onChange(options.map(o => o.value))}
                            className="flex-1 py-2.5 text-xs font-semibold
                                       text-blue-600 hover:bg-blue-50
                                       transition-colors"
                        >
                            Select All
                        </button>
                        <div className="w-px bg-gray-200" />
                        <button
                            onClick={() => onChange([])}
                            className="flex-1 py-2.5 text-xs font-semibold
                                       text-gray-500 hover:bg-gray-100
                                       transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(opt => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-3 px-4 py-3
                                           hover:bg-gray-50 cursor-pointer
                                           transition-colors border-b
                                           border-gray-50 last:border-0"
                            >
                                <div
                                    onClick={() => toggle(opt.value)}
                                    style={{
                                        borderColor: selected.includes(opt.value)
                                            ? accentColor : '#d1d5db',
                                        background : selected.includes(opt.value)
                                            ? accentColor : 'white',
                                    }}
                                    className="w-4 h-4 rounded border-2
                                               flex-shrink-0 flex items-center
                                               justify-center cursor-pointer
                                               transition-all"
                                >
                                    {selected.includes(opt.value) && (
                                        <svg className="w-2.5 h-2.5 text-white"
                                             fill="none" viewBox="0 0 24 24"
                                             stroke="currentColor">
                                            <path strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={3}
                                                  d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-sm text-gray-700 select-none"
                                      onClick={() => toggle(opt.value)}>
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Line Style Legend ─────────────────────────────────────────────────────────
function LineStyleLegend({ viewMode }: { viewMode: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm p-5">
            <p className="text-[11px] font-semibold text-gray-400
                          uppercase tracking-widest mb-4">
                Line Style
            </p>

            <div className="space-y-4">
                {viewMode === 'all' ? (
                    <div className="flex items-center gap-3">
                        <svg width="36" height="12">
                            <line x1="0" y1="6" x2="36" y2="6"
                                  stroke="#374151" strokeWidth="2.5" />
                            <circle cx="18" cy="6" r="3.5"
                                    fill="#374151" />
                        </svg>
                        <span className="text-xs text-gray-600 font-medium">
                            District Average
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Male */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5" />
                                <circle cx="18" cy="6" r="3.5"
                                        fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold
                                              text-gray-700">Male</p>
                                <p className="text-[10px] text-gray-400">
                                    Solid line
                                </p>
                            </div>
                        </div>

                        {/* Female */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5"
                                      strokeDasharray="3,3" />
                                <polygon
                                    points="18,2.5 21.5,9.5 14.5,9.5"
                                    fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold
                                              text-gray-700">Female</p>
                                <p className="text-[10px] text-gray-400">
                                    Dotted line
                                </p>
                            </div>
                        </div>

                        {/* Combined */}
                        <div className="flex items-center gap-3">
                            <svg width="36" height="12">
                                <line x1="0" y1="6" x2="36" y2="6"
                                      stroke="#374151" strokeWidth="2.5"
                                      strokeDasharray="8,3,2,3" />
                                <rect x="14.5" y="2.5" width="7" height="7"
                                      fill="#374151" />
                            </svg>
                            <div>
                                <p className="text-xs font-semibold
                                              text-gray-700">
                                    M+F Combined
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Weighted average
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* State reference */}
                <div className="pt-3 mt-1 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold
                                  uppercase tracking-wider mb-3">
                        Reference
                    </p>
                    <div className="flex items-center gap-3">
                        <svg width="36" height="12">
                            <line x1="0" y1="6" x2="36" y2="6"
                                  stroke="#dc2626" strokeWidth="3"
                                  strokeDasharray="6,3" />
                            <polygon points="18,2 22,10 14,10"
                                     fill="#dc2626" />
                        </svg>
                        <div>
                            <p className="text-xs font-semibold text-red-600">
                                State Average
                            </p>
                            <p className="text-[10px] text-gray-400">
                                Benchmark
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {

    const [allData,      setAllData]      = useState<AllData | null>(null)
    const [districts,    setDistricts]    = useState<string[]>([])
    const [colorMap,     setColorMap]     = useState<Record<string,string>>({})
    const [dataLoading,  setDataLoading]  = useState(true)
    const [error,        setError]        = useState('')

    // Filters — all independent, none resets others
    const [subject,      setSubject]      = useState('Mathematics')
    const [selGrades,    setSelGrades]    = useState<string[]>(['03'])
    const [viewMode,     setViewMode]     = useState<'all'|'gender'>('all')
    const [selDistricts, setSelDistricts] = useState<string[]>([])

    // ── Load ALL data once ─────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            fetch('/api/scores').then(r => r.json()),
            fetch('/api/filters').then(r => r.json()),
        ])
        .then(([scores, filters]) => {
            setAllData(scores)
            setDistricts(filters.districts)
            const map: Record<string,string> = {}
            ;(filters.districts as string[]).forEach((d, i) => {
                map[d] = COLORS[i % COLORS.length]
            })
            setColorMap(map)
            setDataLoading(false)
        })
        .catch(e => {
            setError(e.message)
            setDataLoading(false)
        })
    }, [])

    // ── Filter data in memory ──────────────────────────────────────────────
    const filteredData = useMemo(() => {
        if (!allData) return []
        const source = subject === 'Mathematics'
            ? allData.math : allData.english
        return source.filter(row =>
            selGrades.includes(row.grade) &&
            (viewMode === 'all'
                ? row.subgroup_type === 'ALL'
                : row.subgroup_type === 'GENDER') &&
            (selDistricts.length === 0 ||
             row.level === 'ST' ||
             selDistricts.includes(row.agency_name))
        )
    }, [allData, subject, selGrades, viewMode, selDistricts])

    // ── Build traces ───────────────────────────────────────────────────────
    const traces = useMemo(() => {
        if (!filteredData.length) return []
        const result: object[] = []

        const buildYearMap = (rows: ScoreRow[]) => {
            const m: Record<number,{scores:number[];counts:number[]}> = {}
            rows.forEach(r => {
                const yr = getYear(r.school_year)
                if (!m[yr]) m[yr] = { scores:[], counts:[] }
                m[yr].scores.push(parseFloat(r.avg_scale_score))
                m[yr].counts.push(parseFloat(r.count_tested)||1)
            })
            return m
        }

        if (viewMode === 'all') {
            // One weighted avg line per district
            const byDist: Record<string, ScoreRow[]> = {}
            filteredData.forEach(r => {
                const k = `${r.agency_name}|||${r.level}`
                if (!byDist[k]) byDist[k] = []
                byDist[k].push(r)
            })
            Object.entries(byDist).forEach(([key, rows]) => {
                const [name, level] = key.split('|||')
                const isST = level === 'ST'
                const m = buildYearMap(rows)
                const years  = Object.keys(m).map(Number).sort()
                const scores = years.map(yr =>
                    weightedAvg(m[yr].scores, m[yr].counts))
                result.push({
                    x: years, y: scores,
                    mode: 'lines+markers',
                    name: isST ? 'State Average' : name,
                    legendgroup: isST ? '__state__' : name,
                    showlegend: true,
                    line: {
                        color: isST ? '#dc2626' : colorMap[name]||'#999',
                        width: isST ? 3.5 : 1.5,
                        dash : isST ? 'dash' : 'solid',
                    },
                    marker: {
                        size  : isST ? 10 : 5,
                        color : isST ? '#dc2626' : colorMap[name]||'#999',
                        symbol: isST ? 'diamond' : 'circle',
                    },
                    opacity: isST ? 1 : 0.85,
                    hovertemplate: isST
                        ? `<b>State Average</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`
                        : `<b>${name}</b><br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
                })
            })
        } else {
            // Male + Female + Combined per district
            const distKeys = [...new Set(
                filteredData.map(r => `${r.agency_name}|||${r.level}`)
            )]
            distKeys.forEach(key => {
                const [name, level] = key.split('|||')
                const isST  = level === 'ST'
                const color = isST ? '#dc2626' : colorMap[name]||'#999'

                const maleRows   = filteredData.filter(r =>
                    r.agency_name===name && r.level===level &&
                    r.subgroup_desc==='Male')
                const femaleRows = filteredData.filter(r =>
                    r.agency_name===name && r.level===level &&
                    r.subgroup_desc==='Female')

                const maleMap   = buildYearMap(maleRows)
                const femaleMap = buildYearMap(femaleRows)
                const allYears  = [...new Set([
                    ...Object.keys(maleMap).map(Number),
                    ...Object.keys(femaleMap).map(Number),
                ])].sort()

                // Male
                if (maleRows.length) {
                    const yrs = allYears.filter(yr => maleMap[yr])
                    result.push({
                        x: yrs,
                        y: yrs.map(yr => weightedAvg(
                            maleMap[yr].scores, maleMap[yr].counts)),
                        mode: 'lines+markers',
                        name: isST ? 'State — Male' : name,
                        legendgroup: isST ? '__state_male__' : name,
                        showlegend: true,
                        line  : { color, width: isST?3:1.5, dash:'solid' },
                        marker: { size:isST?9:5, color, symbol:'circle' },
                        opacity: 0.9,
                        hovertemplate: `<b>${name}</b><br>Gender: Male<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
                    })
                }

                // Female
                if (femaleRows.length) {
                    const yrs = allYears.filter(yr => femaleMap[yr])
                    result.push({
                        x: yrs,
                        y: yrs.map(yr => weightedAvg(
                            femaleMap[yr].scores, femaleMap[yr].counts)),
                        mode: 'lines+markers',
                        name: isST ? 'State — Female' : name,
                        legendgroup: isST ? '__state_female__' : name,
                        showlegend: false,
                        line  : { color, width: isST?3:1.5, dash:'dot' },
                        marker: { size:isST?9:5, color, symbol:'diamond' },
                        opacity: 0.9,
                        hovertemplate: `<b>${name}</b><br>Gender: Female<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
                    })
                }

                // Combined weighted avg
                if (maleRows.length && femaleRows.length) {
                    const yrs = allYears.filter(
                        yr => maleMap[yr] && femaleMap[yr])
                    result.push({
                        x: yrs,
                        y: yrs.map(yr => weightedAvg(
                            [...maleMap[yr].scores,...femaleMap[yr].scores],
                            [...maleMap[yr].counts,...femaleMap[yr].counts])),
                        mode: 'lines+markers',
                        name: isST ? 'State — M+F Combined' : name,
                        legendgroup: isST ? '__state_combined__' : name,
                        showlegend: false,
                        line  : { color, width: isST?3:2, dash:'dashdot' },
                        marker: { size:isST?9:5, color, symbol:'square' },
                        opacity: 0.6,
                        hovertemplate: `<b>${name}</b><br>M+F Weighted Avg<br>Year: %{x}<br>Score: %{y:.1f}<extra></extra>`,
                    })
                }
            })
        }
        return result
    }, [filteredData, colorMap, viewMode])

    const districtOptions = useMemo(() =>
        districts.map(d => ({ value: d, label: d })), [districts])

    const gradeLabel = selGrades.length === GRADES.length
        ? 'All Grades'
        : selGrades.map(g => `Grade ${parseInt(g)}`).join(', ')

    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="bg-[#1a3353] shadow-lg">
                <div className="max-w-screen-2xl mx-auto px-8 py-5
                                flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-white/15
                                    flex items-center justify-center
                                    border border-white/20 flex-shrink-0">
                        
                        <img src="/nde-logo.webp" alt="NDE Logo" className="w-9 h-9" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg
                                       tracking-wide leading-none">
                            Nebraska Department of Education
                        </h1>
                        <p className="text-blue-300 text-xs mt-0.5
                                      font-medium tracking-widest uppercase">
                            Assessment Data Dashboard
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-screen-2xl mx-auto px-8 py-8">

                {/* ── Page Title ───────────────────────────────────────── */}
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        District Performance Over Time
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Average scale score trends by district, grade,
                        and student group
                    </p>
                </div>

                {/* ── Filter Bar ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm
                                border border-gray-100 p-6 mb-5">
                    <div className="flex flex-wrap gap-5 items-end">

                        {/* Subject */}
                        <div className="min-w-[190px]">
                            <p className="text-[11px] font-semibold
                                          text-gray-400 uppercase
                                          tracking-widest mb-2">
                                Subject
                            </p>
                            <select
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full h-11 px-4 bg-white
                                           border-2 border-green-400
                                           rounded-xl text-sm font-medium
                                           text-gray-700 hover:bg-gray-50
                                           focus:outline-none focus:ring-2
                                           focus:ring-green-300 transition
                                           shadow-sm cursor-pointer"
                            >
                                <option value="Mathematics">
                                    Mathematics
                                </option>
                                <option value="English Language Arts">
                                    English Language Arts
                                </option>
                            </select>
                        </div>

                        {/* Grade multi-select */}
                        <div className="min-w-[160px]">
                            <MultiSelect
                                label="Grade"
                                options={GRADES}
                                selected={selGrades}
                                onChange={setSelGrades}
                                placeholder="Select grades..."
                                accentColor="#3b82f6"
                            />
                        </div>

                        {/* View Mode toggle */}
                        <div className="min-w-[200px]">
                            <p className="text-[11px] font-semibold
                                          text-gray-400 uppercase
                                          tracking-widest mb-2">
                                Student Group
                            </p>
                            <div className="flex h-11 rounded-xl overflow-hidden
                                            border-2 border-orange-400 shadow-sm">
                                <button
                                    onClick={() => setViewMode('all')}
                                    className={`flex-1 text-sm font-semibold
                                               transition-all px-3 ${
                                        viewMode === 'all'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-orange-50'
                                    }`}
                                >
                                    All Students
                                </button>
                                <div className="w-px bg-orange-300" />
                                <button
                                    onClick={() => setViewMode('gender')}
                                    className={`flex-1 text-sm font-semibold
                                               transition-all px-3 ${
                                        viewMode === 'gender'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-orange-50'
                                    }`}
                                >
                                    By Gender
                                </button>
                            </div>
                        </div>

                        {/* District multi-select */}
                        <div className="flex-1 min-w-[200px] max-w-[320px]">
                            <MultiSelect
                                label="District"
                                options={districtOptions}
                                selected={selDistricts}
                                onChange={setSelDistricts}
                                placeholder="All districts"
                                accentColor="#8b5cf6"
                            />
                        </div>

                        {/* Clear district */}
                        {selDistricts.length > 0 && (
                            <button
                                onClick={() => setSelDistricts([])}
                                className="h-11 px-4 text-sm text-gray-500
                                           hover:text-red-500 border-2
                                           border-gray-200 hover:border-red-300
                                           rounded-xl transition-all font-medium
                                           self-end"
                            >
                                Clear Districts
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Chart + Legend ────────────────────────────────────── */}
                <div className="flex gap-5 items-start">

                    {/* Chart */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm
                                    border border-gray-100 p-6 min-w-0">
                        {/* Chart header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold
                                               text-gray-800">
                                    {subject} — {gradeLabel}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {viewMode === 'all'
                                        ? 'All Students · Weighted average across selected grades'
                                        : 'By Gender · Solid = Male · Dotted = Female · Dash-dot = Combined'}
                                </p>
                            </div>
                            {!dataLoading && (
                                <span className="text-xs font-semibold
                                                 text-gray-400 bg-gray-100
                                                 px-3 py-1.5 rounded-lg">
                                    {traces.length} lines
                                </span>
                            )}
                        </div>

                        {dataLoading ? <ChartSkeleton /> :
                         error ? (
                            <div className="h-64 flex items-center
                                            justify-center text-red-500
                                            text-sm">
                                ⚠️ {error}
                            </div>
                         ) : traces.length === 0 ? (
                            <div className="h-64 flex items-center
                                            justify-center text-gray-400
                                            text-sm">
                                No data for current selection.
                                {selGrades.length === 0 &&
                                    ' Please select at least one grade.'}
                            </div>
                         ) : (
                            <Plot
                                data={traces as any}
                                layout={{
                                    xaxis: {
                                        title    : { text:'School Year', font:{size:12} },
                                        tickmode : 'array',
                                        tickvals : TICK_VALS,
                                        ticktext : TICK_TEXTS,
                                        gridcolor: '#f3f4f6',
                                        linecolor: '#e5e7eb',
                                    },
                                    yaxis: {
                                        title    : { text:'Average Scale Score', font:{size:12} },
                                        gridcolor: '#f3f4f6',
                                        linecolor: '#e5e7eb',
                                    },
                                    hovermode    : 'closest',
                                    showlegend   : false,   // ← hidden from chart
                                    plot_bgcolor : 'white',
                                    paper_bgcolor: 'white',
                                    height  : 520,
                                    margin  : { t:10, r:10, b:60, l:70 },
                                    autosize: true,
                                    font    : { family:'Inter, sans-serif',
                                                size:11, color:'#6b7280' },
                                }}
                                style={{ width:'100%' }}
                                config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    modeBarButtonsToRemove: [
                                        'select2d','lasso2d','autoScale2d'
                                    ],
                                    toImageButtonOptions: {
                                        format  : 'png',
                                        filename: `NDE_${subject}`,
                                        scale   : 2,
                                    },
                                }}
                                useResizeHandler={true}
                            />
                        )}
                    </div>

                    {/* Right Panel — Line Style Legend */}
                    <div className="w-52 flex-shrink-0">
                        <LineStyleLegend viewMode={viewMode} />

                        {/* District legend */}
                        {selDistricts.length > 0 && (
                            <div className="bg-white rounded-2xl border
                                            border-gray-100 shadow-sm
                                            p-5 mt-4">
                                <p className="text-[11px] font-semibold
                                              text-gray-400 uppercase
                                              tracking-widest mb-3">
                                    Selected Districts
                                </p>
                                <div className="space-y-2 max-h-80
                                                overflow-y-auto">
                                    {selDistricts.map(d => (
                                        <div key={d}
                                             className="flex items-center
                                                        gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full
                                                           flex-shrink-0"
                                                style={{
                                                    background: colorMap[d]||'#999'
                                                }}
                                            />
                                            <span className="text-xs
                                                             text-gray-600
                                                             truncate">
                                                {d}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}