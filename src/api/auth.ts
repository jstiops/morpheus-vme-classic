import axios from 'axios'
import { TokenResponse } from '@/types/morpheus'
import { storeTokens } from './client'

export async function login(
  username: string,
  password: string,
  remember: boolean,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
    client_id: 'morph-api',
    scope: 'write',
  })

  const resp = await axios.post<TokenResponse>('/oauth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  storeTokens(resp.data.access_token, resp.data.refresh_token, remember)
  return resp.data
}

export async function fetchCurrentUser() {
  const { apiClient } = await import('./client')
  const resp = await apiClient.get('/api/whoami')
  return resp.data.user
}
