import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { apiMock } = vi.hoisted(() => ({ apiMock: { get: vi.fn(), post: vi.fn() } }))
vi.mock('./lib/api', () => ({ api: apiMock, errorMessage: (error: unknown) => String(error) }))

import App from './App'

describe('sign-in workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.get.mockImplementation((path: string) => {
      if (path === '/auth/me') return Promise.reject(new Error('Not signed in'))
      if (path === '/dashboard') return Promise.resolve({ data: { document_count: 0, questions_asked: 0, quizzes_completed: 0, average_score: 0, recent_documents: [], activity: [] } })
      if (path === '/documents') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: {} })
    })
    apiMock.post.mockResolvedValue({ data: { user: { id: 'user-1', full_name: 'Amina Khan', email: 'amina@example.com', preferred_language: 'English' } } })
  })

  it('signs in and loads the real dashboard route', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
    await user.type(await screen.findByLabelText(/email address/i), 'amina@example.com')
    await user.type(screen.getByLabelText(/password/i), 'a-secure-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('heading', { name: 'Good to see you, Amina.' })).toBeInTheDocument()
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledWith('/dashboard'))
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', { email: 'amina@example.com', password: 'a-secure-password' })
  })
})