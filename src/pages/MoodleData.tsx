import { useState, useEffect } from 'react'
import { BookOpen, RefreshCw, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { MoodleService, MOCK_COURSES } from '../services/moodleService'
import { getMoodleConfig, saveMoodleConfig } from '../lib/storage'
import type { MoodleConfig, MoodleCourse } from '../types'

export default function MoodleData() {
  const [config, setConfig] = useState<MoodleConfig>({ url: '', token: '', connected: false })
  const [courses, setCourses] = useState<MoodleCourse[]>(MOCK_COURSES)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<MoodleCourse | null>(null)

  useEffect(() => {
    getMoodleConfig().then((cfg) => { if (cfg) setConfig(cfg) })
  }, [])

  async function handleTestAndSave() {
    if (!config.url || !config.token) return
    setLoading(true)
    setTestResult(null)
    try {
      const svc = new MoodleService(config.url, config.token)
      const ok = await svc.testConnection()
      setTestResult(ok ? 'success' : 'error')
      if (ok) {
        const updated = { ...config, connected: true, lastSync: new Date().toISOString() }
        saveMoodleConfig(updated)
        setConfig(updated)
        setConfigOpen(false)
      }
    } catch {
      setTestResult('error')
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

      <Modal open={configOpen} onClose={() => { setConfigOpen(false); setTestResult(null) }} title="Configurar Integração Moodle" size="md"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancelar</Button><Button onClick={handleTestAndSave} loading={loading}>Testar e Salvar</Button></div>}
      >
        <div className="form-stack">
          <Input label="URL da instância Moodle" type="url" placeholder="https://moodle.suaong.org.br" value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} hint="URL base sem barra no final." />
          <Input label="Token de acesso (Web Service)" type="password" placeholder="••••••••••••••••" value={config.token} onChange={(e) => setConfig({ ...config, token: e.target.value })} hint="Moodle → Admin → Plugins → Web Services → Gerenciar tokens." />
          {testResult === 'success' && <div className="alert alert--success"><CheckCircle2 size={16} /> Conexão bem-sucedida!</div>}
          {testResult === 'error' && <div className="alert alert--error"><XCircle size={16} /> Falha na conexão. Verifique a URL e o token.</div>}
          <div className="alert alert--info"><strong>Dica:</strong> As configurações ficam salvas localmente. Ao conectar o Firebase, serão migradas para o banco.</div>
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
