import type { MoodleCourse, MoodleUser, MoodleEnrollment } from '../types'

// ── Catálogo de funções conhecidas ─────────────────────────────────────────────
export interface MoodleFunctionInfo {
  name: string
  label: string
  description: string
  category: string
  dashboardUse?: string
}

const KNOWN_FUNCTIONS: Record<string, Omit<MoodleFunctionInfo, 'name'>> = {
  // Cursos
  'core_course_get_courses':            { label: 'Listar cursos', category: 'Cursos', description: 'Retorna todos os cursos da instância.', dashboardUse: 'Grade de cursos, contagem total' },
  'core_course_get_categories':         { label: 'Categorias de cursos', category: 'Cursos', description: 'Lista as categorias existentes.', dashboardUse: 'Filtro por categoria no dashboard' },
  'core_course_search_courses':         { label: 'Buscar cursos', category: 'Cursos', description: 'Pesquisa cursos por palavra-chave.', dashboardUse: 'Campo de busca no dashboard' },
  'core_course_get_course_module':      { label: 'Detalhes de módulo', category: 'Cursos', description: 'Dados de um módulo/atividade específica.', dashboardUse: 'Detalhamento de atividades' },
  // Matrículas
  'core_enrol_get_enrolled_users':      { label: 'Usuários matriculados por curso', category: 'Matrículas', description: 'Lista alunos de um curso com dados de acesso.', dashboardUse: 'Contagem de matrículas, último acesso' },
  'core_enrol_get_users_courses':       { label: 'Cursos de um usuário', category: 'Matrículas', description: 'Lista os cursos em que um usuário está matriculado.', dashboardUse: 'Perfil do aluno' },
  'enrol_self_enrol_user':              { label: 'Auto-matrícula', category: 'Matrículas', description: 'Matricula o usuário via auto-inscrição.', dashboardUse: 'Automações de matrícula' },
  // Usuários
  'core_user_get_users':                { label: 'Listar usuários', category: 'Usuários', description: 'Busca usuários com filtros.', dashboardUse: 'Painel de gestão de alunos' },
  'core_user_get_users_by_field':       { label: 'Buscar usuário por campo', category: 'Usuários', description: 'Localiza usuário por e-mail, username etc.', dashboardUse: 'Busca individual de aluno' },
  'core_user_create_users':             { label: 'Criar usuários', category: 'Usuários', description: 'Cria novos usuários na instância.', dashboardUse: 'Automação de cadastro' },
  'core_user_update_users':             { label: 'Atualizar usuários', category: 'Usuários', description: 'Atualiza dados de usuários existentes.', dashboardUse: 'Sincronização de perfis' },
  // Conclusão
  'core_completion_get_course_completion_status':           { label: 'Status de conclusão do curso', category: 'Conclusão', description: 'Retorna se um usuário concluiu um curso.', dashboardUse: 'Taxa de conclusão por aluno' },
  'core_completion_get_activities_completion_status':       { label: 'Status de conclusão de atividades', category: 'Conclusão', description: 'Conclusão por atividade dentro de um curso.', dashboardUse: 'Progresso detalhado por atividade' },
  'core_completion_update_activity_completion_status_manually': { label: 'Marcar atividade como concluída', category: 'Conclusão', description: 'Altera manualmente o status de conclusão.', dashboardUse: 'Ações administrativas' },
  'report_completion_get_course_completion_status':         { label: 'Relatório de conclusão de curso', category: 'Conclusão', description: 'Relatório completo de conclusão por usuário.', dashboardUse: 'Tabela de conclusão por aluno' },
  // Notas
  'gradereport_user_get_grade_items':   { label: 'Notas do aluno', category: 'Notas', description: 'Itens de nota de um usuário em um curso.', dashboardUse: 'Painel de desempenho acadêmico' },
  'gradereport_overview_get_course_grades': { label: 'Visão geral de notas', category: 'Notas', description: 'Médias e notas gerais por curso.', dashboardUse: 'Gráfico de desempenho por curso' },
  'core_grades_get_grades':             { label: 'Obter notas', category: 'Notas', description: 'Notas de itens específicos de avaliação.', dashboardUse: 'Análise detalhada de avaliações' },
  // Atividades
  'mod_quiz_get_quizzes_by_courses':    { label: 'Questionários por curso', category: 'Atividades', description: 'Lista os quizzes disponíveis em cursos.', dashboardUse: 'Painel de avaliações' },
  'mod_quiz_get_attempt_summary':       { label: 'Resumo de tentativa de quiz', category: 'Atividades', description: 'Dados de uma tentativa de quiz.', dashboardUse: 'Análise de desempenho em avaliações' },
  'mod_assign_get_assignments':         { label: 'Tarefas por curso', category: 'Atividades', description: 'Lista as tarefas de um ou mais cursos.', dashboardUse: 'Painel de tarefas pendentes' },
  'mod_assign_get_submissions':         { label: 'Submissões de tarefas', category: 'Atividades', description: 'Mostra quem submeteu cada tarefa.', dashboardUse: 'Controle de entrega de tarefas' },
  'mod_forum_get_forums_by_courses':    { label: 'Fóruns por curso', category: 'Atividades', description: 'Lista os fóruns de discussão dos cursos.', dashboardUse: 'Engajamento em fóruns' },
  'mod_forum_get_forum_discussions':    { label: 'Discussões de fórum', category: 'Atividades', description: 'Tópicos criados em um fórum.', dashboardUse: 'Participação em discussões' },
  // Site
  'core_webservice_get_site_info':      { label: 'Informações do site', category: 'Sistema', description: 'Versão do Moodle, funções disponíveis, dados do usuário do token.', dashboardUse: 'Diagnóstico e validação da conexão' },
  'core_calendar_get_calendar_events':  { label: 'Eventos do calendário', category: 'Sistema', description: 'Lista eventos do calendário da instância.', dashboardUse: 'Widget de próximos eventos' },
  'tool_mobile_get_config':             { label: 'Configuração mobile', category: 'Sistema', description: 'Configurações para apps mobile.', dashboardUse: 'Não utilizado no dashboard' },
}

export function catalogFunction(name: string): MoodleFunctionInfo {
  const known = KNOWN_FUNCTIONS[name]
  if (known) return { name, ...known }
  // Função desconhecida: gera label a partir do nome
  const parts = name.split('_')
  const label = parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const category = parts[0] === 'core' ? (parts[1] ?? 'Geral') : (parts[0] ?? 'Outro')
  return { name, label, category: category.charAt(0).toUpperCase() + category.slice(1), description: 'Função disponível na sua instância Moodle.' }
}

export class MoodleService {
  private baseUrl: string
  private token: string

  constructor(url: string, token: string) {
    this.baseUrl = url.replace(/\/$/, '')
    this.token = token
  }

  private async call<T>(wsfunction: string, params: Record<string, string | number> = {}): Promise<T> {
    // Sempre usa o proxy /api/moodle para evitar CORS (tanto em dev quanto produção)
    const res = await fetch('/api/moodle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: this.baseUrl, token: this.token, wsfunction, params }),
    })

    let data: Record<string, unknown>
    try {
      data = await res.json()
    } catch {
      throw new Error(`Resposta inválida do servidor (status ${res.status})`)
    }

    if (!res.ok) {
      throw new Error((data?.error as string) || `Erro no proxy: ${res.status}`)
    }

    if (data?.exception) {
      throw new Error((data.message as string) || (data.exception as string))
    }

    return data as T
  }

  async testConnection(): Promise<void> {
    await this.call('core_webservice_get_site_info')
  }

  async getSiteFunctions(): Promise<Array<{ name: string; version: string }>> {
    const data = await this.call<{ functions?: Array<{ name: string; version: string }> }>('core_webservice_get_site_info')
    return data.functions ?? []
  }

  async getCourses(): Promise<MoodleCourse[]> {
    const raw = await this.call<Array<{ id: number; shortname: string; fullname: string; categoryname?: string }>>('core_course_get_courses')
    return raw
      .filter((c) => c.id !== 1)
      .map((c) => ({ id: c.id, shortname: c.shortname, fullname: c.fullname, categoryname: c.categoryname, enrolledCount: 0, completionRate: 0 }))
  }

  async getEnrolledUsers(courseId: number): Promise<MoodleUser[]> {
    const raw = await this.call<Array<{ id: number; username: string; firstname: string; lastname: string; email: string; lastaccess?: number }>>(
      'core_enrol_get_enrolled_users', { courseid: courseId }
    )
    return raw.map((u) => ({ id: u.id, username: u.username, firstname: u.firstname, lastname: u.lastname, email: u.email, lastaccess: u.lastaccess }))
  }

  async getCourseEnrollments(courseId: number, courseName: string): Promise<MoodleEnrollment[]> {
    const users = await this.getEnrolledUsers(courseId)
    return users.map((u) => {
      const lastAccessDate = u.lastaccess ? new Date(u.lastaccess * 1000).toLocaleDateString('pt-BR') : undefined
      const daysSinceAccess = u.lastaccess ? Math.floor((Date.now() - u.lastaccess * 1000) / 86400000) : 999
      return {
        courseId, courseName, userId: u.id,
        userName: `${u.firstname} ${u.lastname}`, email: u.email,
        completionStatus: daysSinceAccess < 7 ? 'inprogress' : 'notattempted',
        lastAccess: lastAccessDate,
      }
    })
  }
}

// ── Mock data para demonstração ───────────────────────────────
export const MOCK_COURSES: MoodleCourse[] = [
  { id: 1, shortname: 'LSM01', fullname: 'Letramento em Saúde Mental — Módulo 1', enrolledCount: 342, completionRate: 68, categoryname: 'Formação Básica' },
  { id: 2, shortname: 'LSM02', fullname: 'Saúde Mental na Escola — Gestores', enrolledCount: 128, completionRate: 45, categoryname: 'Formação Avançada' },
  { id: 3, shortname: 'PSI01', fullname: 'Práticas em Psicologia Escolar', enrolledCount: 95, completionRate: 72, categoryname: 'Psicólogos' },
  { id: 4, shortname: 'DOC01', fullname: 'Bem-estar Docente', enrolledCount: 210, completionRate: 55, categoryname: 'Professores' },
  { id: 5, shortname: 'CRI01', fullname: 'Crise e Intervenção Escolar', enrolledCount: 67, completionRate: 38, categoryname: 'Formação Avançada' },
]

export const MOCK_ENROLLMENTS_TIMELINE = [
  { name: 'Jan', value: 120 }, { name: 'Fev', value: 145 }, { name: 'Mar', value: 162 },
  { name: 'Abr', value: 198 }, { name: 'Mai', value: 234 }, { name: 'Jun', value: 189 },
  { name: 'Jul', value: 256 }, { name: 'Ago', value: 301 }, { name: 'Set', value: 278 },
  { name: 'Out', value: 312 }, { name: 'Nov', value: 345 }, { name: 'Dez', value: 289 },
]

export const MOCK_COMPLETIONS_BY_COURSE = MOCK_COURSES.map((c) => ({
  name: c.shortname,
  concluintes: Math.round(c.enrolledCount * (c.completionRate / 100)),
  matriculados: c.enrolledCount,
}))

export const MOCK_USERS_BY_ROLE = [
  { name: 'Professores', value: 210 },
  { name: 'Gestores', value: 128 },
  { name: 'Psicólogos', value: 95 },
  { name: 'Outros', value: 45 },
]
