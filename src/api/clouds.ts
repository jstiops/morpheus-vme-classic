import { apiClient } from './client'
import {
  ZonesResponse,
  Zone,
  Cluster,
  ClustersResponse,
  ServerGroupsResponse,
  NetworksResponse,
  StorageVolumesResponse,
  DataStore,
  DataStoresResponse,
  ResourcePool,
} from '@/types/morpheus'

export async function listZones(params: { max?: number } = {}): Promise<ZonesResponse> {
  const resp = await apiClient.get<ZonesResponse>('/api/zones', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function getZone(id: number): Promise<Zone> {
  const resp = await apiClient.get<{ zone: Zone }>(`/api/zones/${id}`)
  return resp.data.zone
}

export async function listClusters(
  params: { max?: number } = {},
): Promise<ClustersResponse> {
  const resp = await apiClient.get<ClustersResponse>('/api/clusters', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function getCluster(id: number): Promise<Cluster> {
  const resp = await apiClient.get<{ cluster: Cluster }>(`/api/clusters/${id}`)
  return resp.data.cluster
}

export async function listServerGroups(
  params: { max?: number } = {},
): Promise<ServerGroupsResponse> {
  const resp = await apiClient.get<ServerGroupsResponse>('/api/server-groups', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function listNetworks(
  params: { max?: number; zoneId?: number } = {},
): Promise<NetworksResponse> {
  const resp = await apiClient.get<NetworksResponse>('/api/networks', {
    params: { max: 100, ...params },
  })
  return resp.data
}

export async function listStorageVolumes(
  params: { max?: number } = {},
): Promise<StorageVolumesResponse> {
  const resp = await apiClient.get<StorageVolumesResponse>(
    '/api/storage-volumes',
    { params: { max: 100, ...params } },
  )
  return resp.data
}

export async function listServicePlans(zoneId?: number) {
  const resp = await apiClient.get('/api/service-plans', {
    params: { max: 100, ...(zoneId ? { zoneId } : {}) },
  })
  return resp.data
}

export async function listLayouts(instanceTypeCode?: string) {
  const resp = await apiClient.get('/api/library/layouts', {
    params: {
      max: 100,
      ...(instanceTypeCode ? { instanceTypeCode } : {}),
    },
  })
  return resp.data
}

export async function listDataStores(params: { max?: number } = {}): Promise<DataStore[]> {
  const resp = await apiClient.get<DataStoresResponse>('/api/data-stores', {
    params: { max: 100, ...params },
  })
  return resp.data.datastores ?? []
}

export async function listResourcePools(zoneId: number): Promise<ResourcePool[]> {
  const resp = await apiClient.get<{ resourcePools: ResourcePool[] }>(
    `/api/zones/${zoneId}/resource-pools`,
    { params: { max: 200 } },
  )
  return resp.data.resourcePools ?? []
}

export async function listInstanceTypes() {
  const resp = await apiClient.get('/api/library/instance-types', {
    params: { max: 50 },
  })
  return resp.data
}
