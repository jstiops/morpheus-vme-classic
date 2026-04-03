import { apiClient } from './client'
import {
  Instance,
  Container,
  InstanceVolume,
  InstancesResponse,
  SnapshotsResponse,
  ProcessesResponse,
  ProcessEvent,
} from '@/types/morpheus'

export interface ListInstancesParams {
  max?: number
  offset?: number
  phrase?: string
  status?: string
  zoneId?: number
  serverId?: number
  groupId?: number
}

export async function listInstances(
  params: ListInstancesParams = {},
): Promise<InstancesResponse> {
  const resp = await apiClient.get<InstancesResponse>('/api/instances', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function getInstance(id: number): Promise<Instance> {
  const resp = await apiClient.get<{ instance: Instance }>(
    `/api/instances/${id}`,
  )
  return resp.data.instance
}

export async function getContainer(id: number): Promise<Container> {
  const resp = await apiClient.get<{ container: Container & { networkInterfaces?: Container['interfaces'] } }>(
    `/api/containers/${id}`,
  )
  const c = resp.data.container
  // Morpheus may return networkInterfaces instead of interfaces
  if (!c.interfaces?.length && c.networkInterfaces?.length) {
    c.interfaces = c.networkInterfaces
  }
  return c
}

export async function getProcess(id: number): Promise<ProcessEvent> {
  const resp = await apiClient.get<{ process: ProcessEvent }>(`/api/processes/${id}`)
  return resp.data.process
}

export async function listProcessesByInstance(
  id: number,
  params: { max?: number } = {},
): Promise<ProcessesResponse> {
  const resp = await apiClient.get<ProcessesResponse>('/api/processes', {
    params: { instanceId: id, max: 5, ...params },
  })
  return resp.data
}

export async function getInstanceHistory(
  id: number,
  params: { max?: number; offset?: number } = {},
): Promise<ProcessesResponse> {
  const resp = await apiClient.get<ProcessesResponse>(
    `/api/instances/${id}/history`,
    { params: { max: 50, ...params } },
  )
  return resp.data
}

export async function getInstanceSnapshots(id: number): Promise<SnapshotsResponse> {
  const resp = await apiClient.get<SnapshotsResponse>(
    `/api/instances/${id}/snapshots`,
  )
  return resp.data
}

// ─── Power Actions ────────────────────────────────────────────────────────────

export async function startInstance(id: number) {
  const resp = await apiClient.put(`/api/instances/${id}/start`)
  return resp.data
}

export async function stopInstance(id: number) {
  const resp = await apiClient.put(`/api/instances/${id}/stop`)
  return resp.data
}

export async function restartInstance(id: number) {
  const resp = await apiClient.put(`/api/instances/${id}/restart`)
  return resp.data
}

export async function suspendInstance(id: number) {
  const resp = await apiClient.put(`/api/instances/${id}/suspend`)
  return resp.data
}

export async function ejectInstance(id: number) {
  const resp = await apiClient.put(`/api/instances/${id}/eject`)
  return resp.data
}

export async function mountIso(
  instanceId: number,
  volumes: InstanceVolume[],
  cdromVolumeId: number,
  isoImageId: number,
) {
  // The resize endpoint treats the volumes array as the full desired state,
  // so we must include every volume — not just the CD-ROM one.
  // We pass back only the fields Morpheus needs to identify each volume and
  // leave its configuration unchanged. The only mutation is adding
  // virtualImageId to the CD-ROM entry.
  const resizeVolumes = volumes.map((v) => {
    const base: Record<string, unknown> = {
      id: v.id,
      name: v.name,
      size: v.size,
      storageType: v.storageType,
      rootVolume: v.rootVolume,
      controllerMountPoint: v.controllerMountPoint,
    }
    // Only set datastoreId when it is known — avoid sending 'auto' for
    // volumes that already have a datastore assigned (could trigger a move).
    if (v.datastoreId != null) base.datastoreId = v.datastoreId
    // Mount the selected ISO on the CD-ROM volume.
    if (v.id === cdromVolumeId) base.virtualImageId = isoImageId
    return base
  })
  const resp = await apiClient.put(`/api/instances/${instanceId}/resize`, {
    volumes: resizeVolumes,
  })
  return resp.data
}

// ─── Snapshot Actions ─────────────────────────────────────────────────────────

export async function createSnapshot(
  id: number,
  payload: { name: string; description?: string },
) {
  const resp = await apiClient.put(`/api/instances/${id}/snapshot`, {
    snapshot: payload,
  })
  return resp.data
}

export async function deleteSnapshot(_instanceId: number, snapshotId: number) {
  const resp = await apiClient.delete(`/api/snapshots/${snapshotId}`)
  return resp.data
}

export async function revertSnapshot(instanceId: number, snapshotId: number) {
  const resp = await apiClient.put(
    `/api/instances/${instanceId}/revert-snapshot/${snapshotId}`,
  )
  return resp.data
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateInstancePayload {
  instance: {
    name: string
    description?: string
    zone: { id: number }
    instanceType: { code: string }
    plan: { id: number }
    layout: { id: number }
    group?: { id: number }
    hostName?: string
  }
  config?: Record<string, unknown>
  networkInterfaces?: Array<{ network: { id: number } }>
  volumes?: Array<{ name: string; rootVolume: boolean; size: number }>
}

export async function createInstance(payload: CreateInstancePayload) {
  const resp = await apiClient.post('/api/instances', payload)
  return resp.data
}

export async function updateInstance(id: number, payload: { description?: string }) {
  const resp = await apiClient.put<{ instance: Instance }>(`/api/instances/${id}`, {
    instance: payload,
  })
  return resp.data.instance
}

export async function deleteInstance(id: number, force = false) {
  const resp = await apiClient.delete(`/api/instances/${id}`, {
    params: { force },
  })
  return resp.data
}

// ─── Console ──────────────────────────────────────────────────────────────────

export async function getConsoleUrl(id: number): Promise<{ url: string }> {
  const resp = await apiClient.get<{ url: string }>(
    `/api/instances/${id}/console`,
  )
  return resp.data
}
