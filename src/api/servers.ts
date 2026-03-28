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

export async function startServer(id: number) {
  const resp = await apiClient.put(`/api/servers/${id}/start`)
  return resp.data
}

export async function stopServer(id: number) {
  const resp = await apiClient.put(`/api/servers/${id}/stop`)
  return resp.data
}

export async function restartServer(id: number) {
  const resp = await apiClient.put(`/api/servers/${id}/restart`)
  return resp.data
}

export async function moveServer(
  serverId: number,
  targetHostId: number,
) {
  const resp = await apiClient.put(`/api/servers/${serverId}/placement`, {
    server: {
      preferredParentServer: { id: targetHostId },
    },
  })
  return resp.data
}

export async function setServerPlacementStrategy(
  serverId: number,
  placementStrategy: 'auto' | 'failover' | 'pinned',
) {
  const resp = await apiClient.put(`/api/servers/${serverId}/placement`, {
    server: { placementStrategy },
  })
  return resp.data
}

export async function enableMaintenanceMode(id: number, movePoweredOff = true) {
  const resp = await apiClient.put(`/api/servers/${id}/maintenance`, {
    server: { movePoweredOff },
  })
  return resp.data
}

export async function leaveMaintenanceMode(id: number) {
  const resp = await apiClient.put(`/api/servers/${id}/leave-maintenance`)
  return resp.data
}

export async function getZoneHistory(
  zoneId: number,
  params: { max?: number } = {},
): Promise<ProcessesResponse> {
  const resp = await apiClient.get<ProcessesResponse>(
    `/api/processes`,
    { params: { zoneId, max: 50, ...params } },
  )
  return resp.data
}
