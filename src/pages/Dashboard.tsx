import { Users, BookOpen, TrendingUp, Zap, CheckCircle, UserCheck } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '../components/ui/Card'
import {
  MOCK_ENROLLMENTS_TIMELINE,
  MOCK_COMPLETIONS_BY_COURSE,
  MOCK_USERS_BY_ROLE,
  MOCK_COURSES,
} from '../services/moodleService'
import { Badge } from '../components/ui/Badge'

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444']

export default function Dashboard() {
  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h2 className="page__title">Visão Geral</h2>
          <p className="page__subtitle">Dados consolidados da plataforma Moodle e automações</p>
        </div>
        <span className="page__badge">Dados demonstrativos</span>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          title="Total de Alunos"
          value="842"
          subtitle="na plataforma"
          icon={<Users size={22} />}
          trend={{ value: 12, label: 'vs. mês anterior' }}
          color="primary"
        />
        <MetricCard
          title="Cursos Ativos"
          value="5"
          subtitle="em andamento"
          icon={<BookOpen size={22} />}
          color="info"
        />
        <MetricCard
          title="Taxa de Conclusão"
          value="58%"
          subtitle="média geral"
          icon={<CheckCircle size={22} />}
          trend={{ value: 4, label: 'vs. mês anterior' }}
          color="success"
        />
        <MetricCard
          title="Matrículas (mês)"
          value="345"
          subtitle="em dezembro"
          icon={<TrendingUp size={22} />}
          trend={{ value: -7, label: 'vs. novembro' }}
          color="warning"
        />
        <MetricCard
          title="Ativos (7 dias)"
          value="312"
          subtitle="acessaram recentemente"
          icon={<UserCheck size={22} />}
          color="primary"
        />
        <MetricCard
          title="Automações"
          value="3"
          subtitle="ativas"
          icon={<Zap size={22} />}
          color="info"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        <div className="chart-card chart-card--wide">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Matrículas ao Longo do Ano</h3>
            <span className="chart-card__subtitle">2024</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MOCK_ENROLLMENTS_TIMELINE} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
              />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Matrículas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Alunos por Perfil</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={MOCK_USERS_BY_ROLE}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {MOCK_USERS_BY_ROLE.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Row 2 */}
      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Conclusões vs. Matrículas por Curso</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={MOCK_COMPLETIONS_BY_COURSE} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
            <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="matriculados" name="Matriculados" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="concluintes" name="Concluintes" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Courses Table */}
      <div className="chart-card">
        <div className="chart-card__header">
          <h3 className="chart-card__title">Cursos</h3>
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
              {MOCK_COURSES.map((course) => (
                <tr key={course.id}>
                  <td>
                    <div className="table-course">
                      <span className="table-course__code">{course.shortname}</span>
                      <span className="table-course__name">{course.fullname}</span>
                    </div>
                  </td>
                  <td>{course.categoryname}</td>
                  <td>{course.enrolledCount}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-bar__fill"
                        style={{ width: `${course.completionRate}%` }}
                      />
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
    </div>
  )
}
