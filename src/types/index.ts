export type UserRole = 'admin' | 'manager' | 'viewer'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  active: boolean
  createdAt: string
  lastLogin?: string
  photoURL?: string
}

export interface MoodleConfig {
  url: string
  token: string
  connected: boolean
  lastSync?: string
  enabledFunctions?: string[]
}

export interface MailchimpConfig {
  apiKey: string
  server: string
  listId: string
  connected: boolean
}

export interface MoodleCourse {
  id: number
  shortname: string
  fullname: string
  enrolledCount: number
  completionRate: number
  categoryname?: string
}

export interface MoodleUser {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  lastaccess?: number
  completed?: boolean
}

export interface MoodleEnrollment {
  courseId: number
  courseName: string
  userId: number
  userName: string
  email: string
  completionStatus: 'completed' | 'inprogress' | 'notattempted'
  lastAccess?: string
  grade?: number
}

export type AutomationType =
  | 'on_completion'
  | 'on_enrollment'
  | 'on_inactivity'
  | 'weekly_report'

export interface Automation {
  id: string
  name: string
  type: AutomationType
  courseId?: number
  courseName?: string
  mailchimpTag?: string
  mailchimpListId?: string
  inactivityDays?: number
  active: boolean
  lastRun?: string
  runCount: number
  createdAt: string
  createdBy: string
}

export interface DashboardMetrics {
  totalUsers: number
  activeCourses: number
  completionRate: number
  enrollmentsThisMonth: number
  completionsThisMonth: number
  activeAutomations: number
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface Permission {
  resource: string
  read: boolean
  write: boolean
  delete: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'moodle', 'automations', 'users', 'settings'],
  manager: ['dashboard', 'moodle', 'automations'],
  viewer: ['dashboard', 'moodle'],
}
