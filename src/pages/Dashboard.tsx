import { useState, useEffect, useMemo } from 'react'
import { Users, BookOpen, TrendingUp, CheckCircle, RefreshCw, Layers, UserCheck, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { MoodleService } from '../services/moodleService'
import { getMoodleConfig, getMoodleCourses, saveMoodleCourses, saveMoodleConfig } from '../lib/storage'
import type { MoodleConfig, MoodleCourse, MoodleUser } from '../types'

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899']

// ── Visão consolidada ──────────────────────────────────────────
function ConsolidatedView({ courses }: { courses: MoodleCourse[] }) {
  const totalEnrolled = courses.reduce((s, c) => s + c.enrolledCount, 0)
  const totalCompleted = courses.reduce((s, c) => s + Math.round(c.enrolledCount * c.completionRate / 100), 0)
  const avgCompletion = courses.length
    ? Math.round(courses.reduce((s, c) => s + c.completionRate, 0) / courses.length)
    : 0
  const activeCount = courses.filter(c => c.completionRate < 100).length

  const completionData = courses.map(c => ({
    name: c.shortname,
    Matriculados: c.enrolledCount,
    Concluintes: Math.round(c.enrolledCount * c.completionRate / 100),
  }))

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of courses) {
      const cat = c.categoryname || 'Sem categoria'
      map.set(cat, (map.get(cat) ?? 0) + c.enrolledCount)
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [courses])

  return (
    <>
      <div className="metrics-grid">
        <MetricCard title="Total de Alunos" value={totalEnrolled} subtitle="matriculados" icon={<Users size={22} />} color="primary" />
        <MetricCard title="Cursos Ativos" value={activeCount} subtitle="em andamento" icon={<BookOpen size={22} />} color="info" />
        <MetricCard title="Taxa de Conclusão" value={`${avgCompletion}%`} subtitle="média geral" icon={<CheckCircle size={22} />} color="success" />
        <MetricCard title="Concluintes" value={totalCompleted} subtitle="total" icon={<TrendingUp size={22} />} color="warning" />
      </div>

      <div className="charts-row">
        <div className="chart-card chart-card--wide">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Matriculados vs. Concluintes por Curso</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={completionData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Matriculados" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Concluintes" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {categoryData.length > 1 && (
          <div className="chart-card">
            <div className="chart-card__header">
              <h3 className="chart-card__title">Alunos por Categoria</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name">
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Todos os Cursos</h3>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Categoria</th>
                <th>Alunos</th>
                <th>Conclusão</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>
                    <div className="table-course">
                      <span className="table-course__code">{course.shortname}</span>
                      <span className="table-course__name">{course.fullname}</span>
                    </div>
                  </td>
                  <td>{course.categoryname || '—'}</td>
                  <td>{course.enrolledCount}</td>
                  <td>
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${course.completionRate}%` }} />
                      <span>{course.completionRate}%</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={course.completionRate > 60 ? 'success' : course.completionRate > 40 ? 'warning' : 'danger'}>
                      {course.completionRate > 60 ? 'Bom' : course.completionRate > 40 ? 'Regular' : 'Baixo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Visão por curso ────────────────────────────────────────────
function CourseView({ course, config }: { course: MoodleCourse; config: MoodleConfig }) {
  const [users, setUsers] = useState<MoodleUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [error, setError] = useState('')

  const completed = Math.round(course.enrolledCount * course.completionRate / 100)
  const inProgress = course.enrolledCount - completed

  async function fetchUsers() {
    setLoadingUsers(true)
    setError('')
    try {
      const svc = new MoodleService(config.url, config.token)
      const data = await svc.getEnrolledUsers(course.id)
      setUsers(data)
      setUsersLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingUsers(false)
    }
  }

  return (
    <>
      {course.categoryname && (
        <p className="page__subtitle" style={{ marginTop: -8 }}>{course.categoryname}</p>
      )}

      <div className="metrics-grid">
        <MetricCard title="Matriculados" value={course.enrolledCount} subtitle="neste curso" icon={<Users size={22} />} color="primary" />
        <MetricCard title="Concluintes" value={completed} subtitle={`${course.completionRate}% de conclusão`} icon={<CheckCircle size={22} />} color="success" />
        <MetricCard title="Em Andamento" value={inProgress} subtitle="ainda cursando" icon={<TrendingUp size={22} />} color="warning" />
        <MetricCard title="Taxa de Conclusão" value={`${course.completionRate}%`} subtitle="deste curso" icon={<UserCheck size={22} />} color={course.completionRate > 60 ? 'success' : course.completionRate > 40 ? 'warning' : 'danger'} />
      </div>

      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Progresso do Curso</h3>
        </div>
        <div style={{ padding: '8px 0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>{completed} concluintes</span>
            <span>{inProgress} em andamento</span>
          </div>
          <div className="progress-bar progress-bar--lg">
            <div className="progress-bar__fill" style={{ width: `${course.completionRate}%` }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {course.completionRate}% dos alunos concluíram este curso
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Alunos Matriculados</h3>
          {!usersLoaded && (
            <Button size="sm" variant="secondary" icon={<Users size={13} />} onClick={fetchUsers} loading={loadingUsers}>
              Carregar alunos
            </Button>
          )}
          {usersLoaded && (
            <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={fetchUsers} loading={loadingUsers}>
              Atualizar
            </Button>
          )}
        </div>

        {error && <div className="alert alert--error" style={{ margin: '0 0 12px' }}><AlertCircle size={14} />{error}</div>}

        {!usersLoaded && !loadingUsers && (
          <p className="text-secondary" style={{ fontSize: '0.85rem', padding: '8px 0' }}>
            Clique em "Carregar alunos" para ver a lista de matriculados neste curso.
          </p>
        )}

        {loadingUsers && (
          <p className="text-secondary" style={{ fontSize: '0.85rem', padding: '8px 0' }}>
            Carregando alunos...
          </p>
        )}

        {usersLoaded && users.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Último acesso</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const daysSince = u.lastaccess ? Math.floor((Date.now() - u.lastaccess * 1000) / 86400000) : 999
                  const lastAccessStr = u.lastaccess
                    ? new Date(u.lastaccess * 1000).toLocaleDateString('pt-BR')
                    : 'Nunca'
                  const status = daysSince < 7 ? 'success' : daysSince < 30 ? 'warning' : 'danger'
                  const statusLabel = daysSince < 7 ? 'Ativo' : daysSince < 30 ? 'Pouco ativo' : 'Inativo'
                  return (
                    <tr key={u.id}>
                      <td>{u.firstname} {u.lastname}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.email}</td>
                      <td style={{ fontSize: '0.82rem' }}>{lastAccessStr}</td>
                      <td><Badge variant={status}>{statusLabel}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {usersLoaded && users.length === 0 && (
          <p className="text-secondary" style={{ fontSize: '0.85rem', padding: '8px 0' }}>
            Nenhum aluno matriculado neste curso.
          </p>
        )}
      </div>
    </>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function Dashboard() {
  const [courses, setCourses] = useState<MoodleCourse[]>([])
  const [config, setConfig] = useState<MoodleConfig | null>(null)
  const [selected, setSelected] = useState<'all' | number>('all')
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [cfg, saved] = await Promise.all([getMoodleConfig(), getMoodleCourses()])
      setConfig(cfg)
      if (saved && saved.length > 0) setCourses(saved)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSync() {
    if (!config?.connected) return
    setSyncing(true)
    try {
      const svc = new MoodleService(config.url, config.token)
      const data = await svc.getCourses()
      setCourses(data)
      const updatedCfg = { ...config, lastSync: new Date().toISOString() }
      await Promise.all([saveMoodleConfig(updatedCfg), saveMoodleCourses(data)])
      setConfig(updatedCfg)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = config?.connected ?? false
  const hasRealData = isConnected && courses.length > 0
  const selectedCourse = selected !== 'all' ? courses.find(c => c.id === selected) : null

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
      <div className="page__header">
        <div>
          <h2 className="page__title">
            {selected === 'all' ? 'Visão Geral' : (selectedCourse?.fullname ?? 'Curso')}
          </h2>
          <p className="page__subtitle">
            {isConnected
              ? config?.lastSync
                ? `Sincronizado em ${new Date(config.lastSync).toLocaleString('pt-BR')}`
                : 'Moodle conectado — sincronize para carregar dados'
              : 'Conecte o Moodle em Dados do Moodle para ver dados reais'}
          </p>
        </div>
        <div className="page__actions">
          {!isConnected && <span className="page__badge">Dados demonstrativos</span>}
          {isConnected && (
            <Button variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={handleSync} loading={syncing}>
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de curso */}
      {hasRealData && (
        <div className="course-tabs">
          <button
            className={`course-tab ${selected === 'all' ? 'course-tab--active' : ''}`}
            onClick={() => setSelected('all')}
          >
            <Layers size={13} />
            Todos os cursos
            <span className="course-tab__count">{courses.length}</span>
          </button>
          {courses.map(c => (
            <button
              key={c.id}
              className={`course-tab ${selected === c.id ? 'course-tab--active' : ''}`}
              onClick={() => setSelected(c.id)}
            >
              {c.shortname}
              <span className="course-tab__count">{c.enrolledCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {hasRealData && selected === 'all' && <ConsolidatedView courses={courses} />}
      {hasRealData && selected !== 'all' && selectedCourse && config && (
        <CourseView course={selectedCourse} config={config} />
      )}

      {/* Estado sem dados */}
      {isConnected && !hasRealData && (
        <div className="empty-state">
          <RefreshCw size={32} className="empty-state__icon" />
          <h3>Nenhum dado carregado</h3>
          <p>Clique em Sincronizar para buscar os cursos do Moodle.</p>
          <Button onClick={handleSync} loading={syncing}>Sincronizar agora</Button>
        </div>
      )}

      {!isConnected && (
        <div className="empty-state">
          <BookOpen size={32} className="empty-state__icon" />
          <h3>Moodle não conectado</h3>
          <p>Configure a integração com o Moodle para ver dados reais no dashboard.</p>
          <Button variant="secondary" onClick={() => window.location.href = '/moodle'}>Ir para Dados do Moodle</Button>
        </div>
      )}
    </div>
  )
}
