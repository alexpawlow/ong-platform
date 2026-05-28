import type { MoodleCourse, MoodleUser, MoodleEnrollment } from '../types'

export class MoodleService {
  private baseUrl: string
  private token: string

  constructor(url: string, token: string) {
    this.baseUrl = url.replace(/\/$/, '')
    this.token = token
  }

  private async call<T>(wsfunction: string, params: Record<string, string | number> = {}): Promise<T> {
    const body = new URLSearchParams({
      wstoken: this.token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    })

    const res = await fetch(`${this.baseUrl}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!res.ok) throw new Error(`Moodle HTTP error: ${res.status}`)
    const data = await res.json()
    if (data.exception) throw new Error(data.message || data.exception)
    return data as T
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.call('core_webservice_get_site_info')
      return true
    } catch {
      return false
    }
  }

  async getCourses(): Promise<MoodleCourse[]> {
    const raw = await this.call<Array<{ id: number; shortname: string; fullname: string; categoryname?: string }>>('core_course_get_courses')
    return raw
      .filter((c) => c.id !== 1) // skip site course
      .map((c) => ({
        id: c.id,
        shortname: c.shortname,
        fullname: c.fullname,
        categoryname: c.categoryname,
        enrolledCount: 0,
        completionRate: 0,
      }))
  }

  async getEnrolledUsers(courseId: number): Promise<MoodleUser[]> {
    const raw = await this.call<Array<{ id: number; username: string; firstname: string; lastname: string; email: string; lastaccess?: number }>>(
      'core_enrol_get_enrolled_users',
      { courseid: courseId }
    )
    return raw.map((u) => ({
      id: u.id,
      username: u.username,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      lastaccess: u.lastaccess,
    }))
  }

  async getCourseEnrollments(courseId: number, courseName: string): Promise<MoodleEnrollment[]> {
    const users = await this.getEnrolledUsers(courseId)
    return users.map((u) => {
      const lastAccessDate = u.lastaccess
        ? new Date(u.lastaccess * 1000).toLocaleDateString('pt-BR')
        : undefined
      const daysSinceAccess = u.lastaccess
        ? Math.floor((Date.now() - u.lastaccess * 1000) / 86400000)
        : 999
      return {
        courseId,
        courseName,
        userId: u.id,
        userName: `${u.firstname} ${u.lastname}`,
        email: u.email,
        completionStatus: daysSinceAccess < 7 ? 'inprogress' : 'notattempted',
        lastAccess: lastAccessDate,
      }
    })
  }

  async getDashboardMetrics(): Promise<{
    totalEnrolled: number
    coursesCount: number
    recentActive: number
  }> {
    const courses = await this.getCourses()
    let totalEnrolled = 0
    let recentActive = 0

    for (const course of courses.slice(0, 5)) {
      const users = await this.getEnrolledUsers(course.id)
      totalEnrolled += users.length
      recentActive += users.filter((u) => {
        if (!u.lastaccess) return false
        return Date.now() - u.lastaccess * 1000 < 7 * 86400000
      }).length
    }

    return { totalEnrolled, coursesCount: courses.length, recentActive }
  }
}

// Mock data for demo / when no Moodle is connected
export const MOCK_COURSES: MoodleCourse[] = [
  { id: 1, shortname: 'LSM01', fullname: 'Letramento em Saúde Mental — Módulo 1', enrolledCount: 342, completionRate: 68, categoryname: 'Formação Básica' },
  { id: 2, shortname: 'LSM02', fullname: 'Saúde Mental na Escola — Gestores', enrolledCount: 128, completionRate: 45, categoryname: 'Formação Avançada' },
  { id: 3, shortname: 'PSI01', fullname: 'Práticas em Psicologia Escolar', enrolledCount: 95, completionRate: 72, categoryname: 'Psicólogos' },
  { id: 4, shortname: 'DOC01', fullname: 'Bem-estar Docente', enrolledCount: 210, completionRate: 55, categoryname: 'Professores' },
  { id: 5, shortname: 'CRI01', fullname: 'Crise e Intervenção Escolar', enrolledCount: 67, completionRate: 38, categoryname: 'Formação Avançada' },
]

export const MOCK_ENROLLMENTS_TIMELINE = [
  { name: 'Jan', value: 120 },
  { name: 'Fev', value: 145 },
  { name: 'Mar', value: 162 },
  { name: 'Abr', value: 198 },
  { name: 'Mai', value: 234 },
  { name: 'Jun', value: 189 },
  { name: 'Jul', value: 256 },
  { name: 'Ago', value: 301 },
  { name: 'Set', value: 278 },
  { name: 'Out', value: 312 },
  { name: 'Nov', value: 345 },
  { name: 'Dez', value: 289 },
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
