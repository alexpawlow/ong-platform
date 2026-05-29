import { useState, useEffect, useMemo } from 'react'
import { BookOpen, RefreshCw, CheckCircle2, XCircle, ExternalLink, Zap, Search, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { MoodleService, MOCK_COURSES, catalogFunction } from '../services/moodleService'
import type { MoodleFunctionInfo } from '../services/moodleService'
import { getMoodleConfig, saveMoodleConfig } from '../lib/storage'
import type { MoodleConfig, MoodleCourse } from '../types'

// ── Painel de funções ──────────────────────────────────────────────────────────
function FunctionsPanel({ config, onSave }: { config: MoodleConfig; onSave: (cfg: MoodleConfig) => void }) {
  const [functions, setFunctions] = useState<MoodleFunctionInfo[]>([])
  const [enabled, setEnabled] = useState<Set<string>>(new Set(config.enabledFunctions ?? []))
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  async function fetchFunctions() {
    setLoading(true)
    setError('')
    try {
      const svc = new MoodleService(config.url, config.token)
      const raw = await svc.getSiteFunctions()
      setFunctions(raw.map(f => catalogFunction(f.name)))
      setLoaded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? functions.filter(f => f.name.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : functions
  }, [functions, search])

  const grouped = useMemo(() => {
    const map = new Map<string, MoodleFunctionInfo[]>()
    for (const f of filtered) {
      const arr = map.get(f.category) ?? []
      arr.push(f)
      map.set(f.category, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function toggleFunction(name: string) {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleCategory(fns: MoodleFunctionInfo[]) {
    const names = fns.map(f => f.name)
    const allOn = names.every(n => enabled.has(n))
    setEnabled(prev => {
      const next = new Set(prev)
      names.forEach(n => allOn ? next.delete(n) : next.add(n))
      return next
    })
  }

  function toggleCollapse(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const updated = { ...config, enabledFunctions: Array.from(enabled) }
    await saveMoodleConfig(updated)
    onSave(updated)
    setSaving(false)
  }

  if (!loaded) {
    return (
      <Card className="functions-panel">
        <div className="functions-panel__header">
          <Zap size={16} />
          <strong>Funções do Dashboard</strong>
          <span className="text-secondary" style={{ fontSize: 13 }}>Escolha quais dados do Moodle alimentam o dashboard</span>
        </div>
        {error && <div className="alert alert--error"><XCircle size={14} />{error}</div>}
        <Button size="sm" variant="secondary" onClick={fetchFunctions} loading={loading}>
          Carregar funções disponíveis
        </Button>
      </Card>
    )
  }

  return (
    <Card className="functions-panel">
      <div className="functions-panel__header">
        <Zap size={16} />
        <strong>Funções do Dashboard</strong>
        <Badge variant="primary">{enabled.size} ativas</Badge>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={fetchFunctions} loading={loading}>Atualizar</Button>
          <Button size="sm" icon={<Save size={13} />} onClick={handleSave} loading={saving}>Salvar seleção</Button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input
          className="functions-search"
          placeholder="Filtrar funções..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
      </div>

      <div className="functions-list">
        {grouped.map(([cat, fns]) => {
          const isCollapsed = collapsed.has(cat)
          const allOn = fns.every(f => enabled.has(f.name))
          const someOn = fns.some(f => enabled.has(f.name))
          return (
            <div key={cat} className="functions-group">
              <div className="functions-group__header" onClick={() => toggleCollapse(cat)}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className="functions-group__name">{cat}</span>
                <span className="functions-group__count">{fns.length} função{fns.length !== 1 ? 'ões' : ''}</span>
                <label className="functions-checkbox" onClick={e => { e.stopPropagation(); toggleCategory(fns) }}>
                  <input type="checkbox" checked={allOn} ref={el => { if (el) el.indeterminate = !allOn && someOn }} onChange={() => {}} />
                  <span>Todas</span>
                </label>
              </div>
              {!isCollapsed && (
                <div className="functions-group__items">
                  {fns.map(fn => (
                    <label key={fn.name} className={`function-item ${enabled.has(fn.name) ? 'function-item--active' : ''}`}>
                      <input type="checkbox" checked={enabled.has(fn.name)} onChange={() => toggleFunction(fn.name)} />
                      <div className="function-item__body">
                        <span className="function-item__label">{fn.label}</span>
                        <code className="function-item__name">{fn.name}</code>
                        <span className="function-item__desc">{fn.description}</span>
                        {fn.dashboardUse && (
                          <span className="function-item__use"><Zap size={10} /> {fn.dashboardUse}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {grouped.length === 0 && (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '24px 0' }}>Nenhuma função encontrada para "{search}".</p>
        )}
      </div>
    </Card>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function MoodleData() {
  const [config, setConfig] = useState<MoodleConfig>({ url: '', token: '', connected: false })
  const [courses, setCourses] = useState<MoodleCourse[]>(MOCK_COURSES)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testError, setTestError] = useState<string>('')
  const [selectedCourse, setSelectedCourse] = useState<MoodleCourse | null>(null)

  useEffect(() => {
    getMoodleConfig().then((cfg) => { if (cfg) setConfig(cfg) })
  }, [])

  async function handleTestAndSave() {
    if (!config.url || !config.token) return
    setLoading(true)
    setTestResult(null)
    setTestError('')
    try {
      const svc = new MoodleService(config.url, config.token)
      await svc.testConnection()
      setTestResult('success')
      const updated = { ...config, connected: true, lastSync: new Date().toISOString() }
      await saveMoodleConfig(updated)
      setConfig(updated)
      setTimeout(() => setConfigOpen(false), 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setTestResult('error')
      setTestError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    if (!config.connected) { setCourses(MOCK_COURSES); return }
    setSyncing(true)
    try {
      const svc = new MoodleService(config.url, config.token)
      const data = await svc.getCourses()
      setCourses(data)
      saveMoodleConfig({ ...config, lastSync: new Date().toISOString() })
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h2 className="page__title">Dados do Moodle</h2>
          <p className="page__subtitle">Cursos, matrículas e conclusões da sua instância</p>
        </div>
        <div className="page__actions">
          <Button variant="ghost" size="sm" icon={<RefreshCw size={15} />} onClick={handleSync} loading={syncing}>Sincronizar</Button>
          <Button variant="secondary" size="sm" icon={<BookOpen size={15} />} onClick={() => setConfigOpen(true)}>Configurar Moodle</Button>
        </div>
      </div>

      <Card className="moodle-status">
        <div className="moodle-status__icon">
          {config.connected ? <CheckCircle2 size={20} className="text-success" /> : <XCircle size={20} className="text-warning" />}
        </div>
        <div className="moodle-status__info">
          <strong>{config.connected ? 'Conectado' : 'Não configurado'}</strong>
          {config.connected
            ? <span>{config.url} · Última sincronização: {config.lastSync ? new Date(config.lastSync).toLocaleString('pt-BR') : 'nunca'}</span>
            : <span>Configure as credenciais da API do Moodle para sincronizar dados reais.</span>}
        </div>
        {!config.connected && <Badge variant="warning">Dados demonstrativos</Badge>}
        {!config.connected && <Button size="sm" onClick={() => setConfigOpen(true)}>Configurar agora</Button>}
      </Card>

      {config.connected && (
        <FunctionsPanel config={config} onSave={setConfig} />
      )}

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card" onClick={() => setSelectedCourse(course)}>
            <div className="course-card__header">
              <span className="course-card__code">{course.shortname}</span>
              <Badge variant={course.completionRate > 60 ? 'success' : course.completionRate > 40 ? 'warning' : 'danger'}>{course.completionRate}%</Badge>
            </div>
            <h4 className="course-card__name">{course.fullname}</h4>
            {course.categoryname && <span className="course-card__category">{course.categoryname}</span>}
            <div className="course-card__stats">
              <div className="course-card__stat"><span className="course-card__stat-value">{course.enrolledCount}</span><span className="course-card__stat-label">Matriculados</span></div>
              <div className="course-card__stat"><span className="course-card__stat-value">{Math.round(course.enrolledCount * course.completionRate / 100)}</span><span className="course-card__stat-label">Concluintes</span></div>
            </div>
            <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${course.completionRate}%` }} /></div>
            <button className="course-card__link"><ExternalLink size={13} /> Ver detalhes</button>
          </div>
        ))}
      </div>

      <Modal open={configOpen} onClose={() => { setConfigOpen(false); setTestResult(null); setTestError('') }} title="Configurar Integração Moodle" size="md"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancelar</Button><Button onClick={handleTestAndSave} loading={loading}>Testar e Salvar</Button></div>}
      >
        <div className="form-stack">
          <Input label="URL da instância Moodle" type="url" placeholder="https://moodle.suaong.org.br" value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} hint="URL base sem barra no final." />
          <Input label="Token de acesso (Web Service)" type="password" placeholder="••••••••••••••••" value={config.token} onChange={(e) => setConfig({ ...config, token: e.target.value })} hint="Moodle → Admin → Plugins → Web Services → Gerenciar tokens." />
          {testResult === 'success' && <div className="alert alert--success"><CheckCircle2 size={16} /> Conexão bem-sucedida!</div>}
          {testResult === 'error' && (
            <div className="alert alert--error">
              <XCircle size={16} />
              <span>{testError || 'Falha na conexão. Verifique a URL e o token.'}</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!selectedCourse} onClose={() => setSelectedCourse(null)} title={selectedCourse?.shortname || ''} size="md">
        {selectedCourse && (
          <div className="form-stack">
            <p className="text-secondary">{selectedCourse.fullname}</p>
            <div className="stats-row">
              <div className="stat-block"><span className="stat-block__value">{selectedCourse.enrolledCount}</span><span className="stat-block__label">Matriculados</span></div>
              <div className="stat-block"><span className="stat-block__value">{Math.round(selectedCourse.enrolledCount * selectedCourse.completionRate / 100)}</span><span className="stat-block__label">Concluintes</span></div>
              <div className="stat-block"><span className="stat-block__value">{selectedCourse.completionRate}%</span><span className="stat-block__label">Taxa de conclusão</span></div>
            </div>
            <div className="progress-bar progress-bar--lg"><div className="progress-bar__fill" style={{ width: `${selectedCourse.completionRate}%` }} /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
