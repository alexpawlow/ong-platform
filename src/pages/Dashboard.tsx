import { useState, useEffect, useMemo } from 'react'
import { BookOpen, RefreshCw, Layers } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { MoodleService } from '../services/moodleService'
import { getMoodleConfig, getMoodleSnapshot, saveMoodleConfig, saveMoodleSnapshot, saveMoodleCourses } from '../lib/storage'
import type { MoodleConfig, MoodleSnapshot } from '../types'

// ── Internal types ─────────────────────────────────────────────
interface EnrollmentRow {
  userId: number
  userName: string
  email: string
  courseId: number
  courseName: string
  courseShortname: string
  lastaccess?: number
  daysSinceAccess: number
  status: 'active' | 'inactive' | 'never'
}

type SortKey = 'userName' | 'email' | 'courseName' | 'daysSinceAccess' | 'status'

// ── Utility functions ──────────────────────────────────────────
function buildRows(snapshot: MoodleSnapshot): EnrollmentRow[] {
  const rows: EnrollmentRow[] = []
  for (const course of snapshot.courses) {
    const users = snapshot.usersByCourse[course.id] ?? []
    for (const u of users) {
      const days = u.lastaccess && u.lastaccess > 0
        ? Math.floor((Date.now() - u.lastaccess * 1000) / 86400000)
        : 999
      const status: EnrollmentRow['status'] = !u.lastaccess || u.lastaccess === 0
        ? 'never'
        : days <= 30
          ? 'active'
          : 'inactive'
      rows.push({
        userId: u.id,
        userName: `${u.firstname} ${u.lastname}`,
        email: u.email,
        courseId: course.id,
        courseName: course.fullname,
        courseShortname: course.shortname,
        lastaccess: u.lastaccess,
        daysSinceAccess: days,
        status,
      })
    }
  }
  return rows
}

function fmtDate(ts?: number) {
  if (!ts || ts === 0) return 'Nunca'
  return new Date(ts * 1000).toLocaleDateString('pt-BR')
}

function statusBadge(status: EnrollmentRow['status'], days: number) {
  if (status === 'never') return { label: 'Nunca acessou', variant: 'danger' as const }
  if (days <= 7) return { label: 'Ativo', variant: 'success' as const }
  if (days <= 15) return { label: `${days}d atrás`, variant: 'success' as const }
  if (days <= 30) return { label: `${days}d atrás`, variant: 'warning' as const }
  return { label: `${days}d inativo`, variant: 'danger' as const }
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="db-kpi" style={{ '--kpi-c': color } as React.CSSProperties}>
      <div className="db-kpi__label">{label}</div>
      <div className="db-kpi__value">{value}</div>
      <div className="db-kpi__sub">{sub}</div>
    </div>
  )
}

const TOOLTIP_STYLE = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
}

// ── Dashboard principal ────────────────────────────────────────
export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<MoodleSnapshot | null>(null)
  const [config, setConfig] = useState<MoodleConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Tabs
  const [selectedCourse, setSelectedCourse] = useState<'all' | number>('all')

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'accessed' | 'never' | 'inactive' | 'active7'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterInactiveDays, setFilterInactiveDays] = useState<number | null>(null)
  const [pendingStatus, setPendingStatus] = useState<typeof filterStatus>('all')
  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingInactive, setPendingInactive] = useState<number | null>(null)

  // Table
  const [sortKey, setSortKey] = useState<SortKey>('userName')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<25 | 50 | 100>(25)

  useEffect(() => {
    async function load() {
      const [cfg, snap] = await Promise.all([getMoodleConfig(), getMoodleSnapshot()])
      setConfig(cfg)
      setSnapshot(snap)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSync() {
    if (!config?.connected) return
    setSyncing(true)
    try {
      const svc = new MoodleService(config.url, config.token)
      const fetchedCourses = await svc.getCourses()
      const userResults = await Promise.allSettled(
        fetchedCourses.map(c => svc.getEnrolledUsers(c.id).then(users => ({ courseId: c.id, users })))
      )
      const usersByCourse: Record<number, import('../types').MoodleUser[]> = {}
      fetchedCourses.forEach((c, i) => {
        const r = userResults[i]
        if (r.status === 'fulfilled') {
          usersByCourse[c.id] = r.value.users
          c.enrolledCount = r.value.users.length
          const accessed = r.value.users.filter(u => u.lastaccess && u.lastaccess > 0).length
          c.completionRate = r.value.users.length > 0 ? Math.round(accessed / r.value.users.length * 100) : 0
        }
      })
      const updatedCfg = { ...config, lastSync: new Date().toISOString() }
      const newSnapshot: MoodleSnapshot = { courses: fetchedCourses, usersByCourse, syncedAt: updatedCfg.lastSync! }
      await Promise.all([saveMoodleConfig(updatedCfg), saveMoodleCourses(fetchedCourses), saveMoodleSnapshot(newSnapshot)])
      setConfig(updatedCfg)
      setSnapshot(newSnapshot)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  // All rows from snapshot
  const allRows = useMemo(() => snapshot ? buildRows(snapshot) : [], [snapshot])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let rows = allRows

    // Course tab filter
    if (selectedCourse !== 'all') {
      rows = rows.filter(r => r.courseId === selectedCourse)
    }

    // Status filter
    if (filterStatus === 'accessed') {
      rows = rows.filter(r => r.status !== 'never')
    } else if (filterStatus === 'never') {
      rows = rows.filter(r => r.status === 'never')
    } else if (filterStatus === 'inactive') {
      rows = rows.filter(r =>
        r.status !== 'never' &&
        (filterInactiveDays === null || r.daysSinceAccess > filterInactiveDays)
      )
    } else if (filterStatus === 'active7') {
      rows = rows.filter(r => r.status !== 'never' && r.daysSinceAccess <= 7)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(r =>
        r.userName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      )
    }

    return rows
  }, [allRows, selectedCourse, filterStatus, searchQuery, filterInactiveDays])

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let av: string | number = a[sortKey]
      let bv: string | number = b[sortKey]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
  }, [filteredRows, sortKey, sortAsc])

  // KPI metrics from filteredRows
  const metrics = useMemo(() => {
    const total = filteredRows.length
    const accessed = filteredRows.filter(r => r.status !== 'never').length
    const never = filteredRows.filter(r => r.status === 'never').length
    const accessRate = total > 0 ? Math.round(accessed / total * 100) : 0
    const inactive15 = filteredRows.filter(r => r.status !== 'never' && r.daysSinceAccess > 15).length
    const active7 = filteredRows.filter(r => r.status !== 'never' && r.daysSinceAccess <= 7).length
    const courseCount = snapshot?.courses.length ?? 0
    return { total, accessed, never, accessRate, inactive15, active7, courseCount }
  }, [filteredRows, snapshot])

  // Chart data
  const chartEnrollments = useMemo(() => {
    if (!snapshot) return []
    return snapshot.courses.map(c => ({ name: c.shortname, value: c.enrolledCount }))
  }, [snapshot])

  const chartPie = useMemo(() => {
    const neverCount = filteredRows.filter(r => r.status === 'never').length
    const activeCount = filteredRows.filter(r => r.status === 'active').length
    const inactiveCount = filteredRows.filter(r => r.status === 'inactive').length
    return [
      { name: 'Nunca Acessou', value: neverCount },
      { name: 'Ativo (≤30d)', value: activeCount },
      { name: 'Inativo (>30d)', value: inactiveCount },
    ]
  }, [filteredRows])

  const chartActiveVsInactive = useMemo(() => {
    if (!snapshot) return []
    return snapshot.courses.map(c => {
      const users = snapshot.usersByCourse[c.id] ?? []
      const accessed = users.filter(u => u.lastaccess && u.lastaccess > 0).length
      const never = users.length - accessed
      return { name: c.shortname, Acessaram: accessed, 'Nunca Acessaram': never }
    })
  }, [snapshot])

  const chartInactivity = useMemo(() => {
    const rows = filteredRows.filter(r => r.status !== 'never')
    return [
      { name: '0-7 dias', value: rows.filter(r => r.daysSinceAccess <= 7).length },
      { name: '8-15 dias', value: rows.filter(r => r.daysSinceAccess > 7 && r.daysSinceAccess <= 15).length },
      { name: '16-30 dias', value: rows.filter(r => r.daysSinceAccess > 15 && r.daysSinceAccess <= 30).length },
      { name: '31-60 dias', value: rows.filter(r => r.daysSinceAccess > 30 && r.daysSinceAccess <= 60).length },
      { name: '60+ dias', value: rows.filter(r => r.daysSinceAccess > 60 && r.daysSinceAccess < 999).length },
    ]
  }, [filteredRows])

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / perPage)
  const pagedRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(v => !v)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
    setPage(1)
  }

  function handleFilter() {
    setFilterStatus(pendingStatus)
    setSearchQuery(pendingSearch)
    setFilterInactiveDays(pendingInactive)
    setPage(1)
  }

  function handleClear() {
    setPendingStatus('all')
    setPendingSearch('')
    setPendingInactive(null)
    setFilterStatus('all')
    setSearchQuery('')
    setFilterInactiveDays(null)
    setPage(1)
  }

  function sortInd(key: SortKey) {
    if (sortKey !== key) return <span className="sort-ind">↕</span>
    return <span className="sort-ind">{sortAsc ? '↑' : '↓'}</span>
  }

  const isConnected = config?.connected ?? false

  if (loading) {
    return (
      <div className="page">
        <div className="page__header"><div><h2 className="page__title">Dashboard</h2></div></div>
        <p className="text-secondary">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h2 className="page__title">Dashboard</h2>
          <p className="page__subtitle">
            {isConnected
              ? config?.lastSync
                ? `Sincronizado em ${new Date(config.lastSync).toLocaleString('pt-BR')}`
                : 'Moodle conectado — sincronize para carregar dados'
              : 'Conecte o Moodle em Dados do Moodle para ver dados reais'}
          </p>
        </div>
        <div className="page__actions">
          {!isConnected && <Badge variant="warning">Moodle não conectado</Badge>}
          {isConnected && (
            <Button variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={handleSync} loading={syncing}>
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* Not connected */}
      {!isConnected && (
        <div className="empty-state">
          <BookOpen size={32} className="empty-state__icon" />
          <h3>Moodle não conectado</h3>
          <p>Configure a integração com o Moodle para ver dados reais no dashboard.</p>
          <Button variant="secondary" onClick={() => window.location.href = '/moodle'}>Ir para Dados do Moodle</Button>
        </div>
      )}

      {/* Connected but no snapshot */}
      {isConnected && !snapshot && (
        <div className="empty-state">
          <RefreshCw size={32} className="empty-state__icon" />
          <h3>Nenhum dado carregado</h3>
          <p>Clique em Sincronizar para buscar os cursos e alunos do Moodle.</p>
          <Button onClick={handleSync} loading={syncing}>Sincronizar agora</Button>
        </div>
      )}

      {/* Main dashboard content */}
      {isConnected && snapshot && (
        <>
          {/* Course tabs */}
          <div className="course-tabs">
            <button
              className={`course-tab ${selectedCourse === 'all' ? 'course-tab--active' : ''}`}
              onClick={() => { setSelectedCourse('all'); setPage(1) }}
            >
              <Layers size={13} />
              Todos os cursos
              <span className="course-tab__count">{snapshot.courses.length}</span>
            </button>
            {snapshot.courses.map(c => (
              <button
                key={c.id}
                className={`course-tab ${selectedCourse === c.id ? 'course-tab--active' : ''}`}
                onClick={() => { setSelectedCourse(c.id); setPage(1) }}
              >
                {c.shortname}
                <span className="course-tab__count">{c.enrolledCount}</span>
              </button>
            ))}
          </div>

          {/* KPI Grid */}
          <div className="db-kpi-grid">
            <KpiCard label="Total de Alunos" value={metrics.total} sub="registros de matrícula" color="#6366f1" />
            <KpiCard label="Acessaram" value={metrics.accessed} sub="com lastaccess > 0" color="#22c55e" />
            <KpiCard label="Nunca Acessaram" value={metrics.never} sub="sem lastaccess" color="#f59e0b" />
            <KpiCard label="Taxa de Acesso" value={`${metrics.accessRate}%`} sub="dos matriculados" color="#a855f7" />
            <KpiCard label="Inativos > 15 dias" value={metrics.inactive15} sub="acessaram há mais de 15d" color="#ec4899" />
            <KpiCard label="Ativos (7 dias)" value={metrics.active7} sub="acessaram nos últimos 7d" color="#0ea5e9" />
            <KpiCard label="Total de Cursos" value={metrics.courseCount} sub="cursos no Moodle" color="#ef4444" />
          </div>

          {/* Filters */}
          <div className="db-filters">
            {selectedCourse === 'all' && (
              <div className="db-filter-group">
                <label className="db-filter-label">Curso</label>
                <select className="db-filter-select" value="all" onChange={() => {}}>
                  <option value="all">Todos</option>
                  {snapshot.courses.map(c => (
                    <option key={c.id} value={c.id}>{c.fullname}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="db-filter-group">
              <label className="db-filter-label">Status</label>
              <select
                className="db-filter-select"
                value={pendingStatus}
                onChange={e => setPendingStatus(e.target.value as typeof filterStatus)}
              >
                <option value="all">Todos</option>
                <option value="accessed">Acessaram</option>
                <option value="never">Nunca Acessaram</option>
                <option value="inactive">Inativos</option>
                <option value="active7">Ativos 7 dias</option>
              </select>
            </div>
            <div className="db-filter-group">
              <label className="db-filter-label">Buscar</label>
              <input
                className="db-filter-input"
                placeholder="Nome ou e-mail..."
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
              />
            </div>
            <div className="db-filter-group" style={{ minWidth: 160 }}>
              <label className="db-filter-label">Inativo há mais de</label>
              <select
                className="db-filter-select"
                value={pendingInactive ?? ''}
                onChange={e => setPendingInactive(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">Todos</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
            <div className="db-filter-actions">
              <Button size="sm" onClick={handleFilter}>Filtrar</Button>
              <Button size="sm" variant="ghost" onClick={handleClear}>Limpar</Button>
            </div>
          </div>

          {/* Charts 2x2 */}
          <div className="db-charts-grid">
            {/* Chart 1: Enrollments per course */}
            <div className="db-chart-card">
              <div className="db-chart-title">Matrículas por Curso</div>
              <div className="db-chart-sub">Total de alunos matriculados em cada curso</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartEnrollments} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={80} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Matriculados" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Access status pie */}
            <div className="db-chart-card">
              <div className="db-chart-title">Status de Acesso</div>
              <div className="db-chart-sub">Distribuição dos alunos por status</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartPie}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    <Cell fill="#ef4444" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Active vs Inactive per course (all courses view) */}
            <div className="db-chart-card">
              <div className="db-chart-title">Ativos vs. Inativos por Curso</div>
              <div className="db-chart-sub">Comparativo de engajamento por curso</div>
              {selectedCourse === 'all' ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartActiveVsInactive} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Acessaram" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Nunca Acessaram" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-secondary" style={{ fontSize: '0.82rem', padding: '8px 0' }}>
                  Selecione "Todos os cursos" para ver comparativo.
                </p>
              )}
            </div>

            {/* Chart 4: Inactivity distribution */}
            <div className="db-chart-card">
              <div className="db-chart-title">Distribuição de Inatividade</div>
              <div className="db-chart-sub">Alunos que já acessaram, agrupados por dias sem acesso</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartInactivity} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Alunos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Students table */}
          <div className="db-table-card">
            <div className="db-table-header">
              <div>
                <div className="db-table-title">Alunos Matriculados</div>
                <div className="db-table-count">{filteredRows.length} registro{filteredRows.length !== 1 ? 's' : ''} encontrado{filteredRows.length !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Por página:</span>
                {([25, 50, 100] as const).map(n => (
                  <button
                    key={n}
                    className={`db-pager-btn ${perPage === n ? 'active' : ''}`}
                    onClick={() => { setPerPage(n); setPage(1) }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="db-table-scroll">
              <table className="db-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th className={sortKey === 'userName' ? 'active' : ''} onClick={() => handleSort('userName')}>
                      Nome {sortInd('userName')}
                    </th>
                    <th className={sortKey === 'email' ? 'active' : ''} onClick={() => handleSort('email')}>
                      E-mail {sortInd('email')}
                    </th>
                    {selectedCourse === 'all' && (
                      <th className={sortKey === 'courseName' ? 'active' : ''} onClick={() => handleSort('courseName')}>
                        Curso {sortInd('courseName')}
                      </th>
                    )}
                    <th>Último Acesso</th>
                    <th className={sortKey === 'daysSinceAccess' ? 'active' : ''} onClick={() => handleSort('daysSinceAccess')}>
                      Inativo há {sortInd('daysSinceAccess')}
                    </th>
                    <th className={sortKey === 'status' ? 'active' : ''} onClick={() => handleSort('status')}>
                      Status {sortInd('status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, i) => {
                    const badge = statusBadge(row.status, row.daysSinceAccess)
                    return (
                      <tr key={`${row.userId}-${row.courseId}`}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {(page - 1) * perPage + i + 1}
                        </td>
                        <td>{row.userName}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{row.email}</td>
                        {selectedCourse === 'all' && (
                          <td>
                            <span style={{ fontSize: '0.78rem' }}>{row.courseShortname}</span>
                          </td>
                        )}
                        <td style={{ fontSize: '0.78rem' }}>{fmtDate(row.lastaccess)}</td>
                        <td style={{ fontSize: '0.78rem' }}>
                          {row.status === 'never' ? '—' : row.daysSinceAccess < 999 ? `${row.daysSinceAccess}d` : '—'}
                        </td>
                        <td>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                  {pagedRows.length === 0 && (
                    <tr>
                      <td colSpan={selectedCourse === 'all' ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Nenhum registro encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="db-pager">
                <div className="db-pager-info">
                  Mostrando {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredRows.length)} de {filteredRows.length}
                </div>
                <div className="db-pager-btns">
                  <button
                    className="db-pager-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        className={`db-pager-btn ${page === p ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  })}
                  {totalPages > 7 && page < totalPages && (
                    <>
                      {page < totalPages - 3 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
                      <button
                        className={`db-pager-btn ${page === totalPages ? 'active' : ''}`}
                        onClick={() => setPage(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    className="db-pager-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
