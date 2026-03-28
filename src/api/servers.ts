import { apiClient } from './client'
import { ServersResponse, ComputeServer, ProcessesResponse } from '@/types/morpheus'

export async function listServers(
  params: { max?: number; offset?: number; phrase?: string; zoneId?: number; serverGroupId?: number; vmHypervisor?: boolean } = {},
): Promise<ServersResponse> {
  const resp = await apiClient.get<ServersResponse>('/api/servers', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function getServer(id: number): Promise<ComputeServer> {
  const resp = await apiClient.get<{ server: ComputeServer }>(
    `/api/servers/${id}`,
  )
  return resp.data.server
}

export async function getServerHistory(
  id: number,
  params: { max?: number } = {},
): Promise<ProcessesResponse> {
  const resp = await apiClient.get<ProcessesResponse>(
    `/api/processes`,
    { params: { serverId: id, max: 50, ...params } },
  )
  return resp.data
}
