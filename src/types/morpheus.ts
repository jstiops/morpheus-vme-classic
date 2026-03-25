// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number
  offset: number
  max: number
}

export type PowerState =
  | 'running'
  | 'stopped'
  | 'suspended'
  | 'failed'
  | 'unknown'
  | 'warning'
  | 'provisioning'
  | 'starting'
  | 'stopping'

// ─── Zone / Cloud / Datacenter ────────────────────────────────────────────────

export interface Zone {
  id: number
  name: string
  code: string
  description?: string
  zoneType: {
    id: number
    name: string
    code: string
  }
  status: string
  agentMode?: string
  serverCount: number
  instanceCount: number
  regionCode?: string
  location?: string
}

export interface ZonesResponse {
  zones: Zone[]
  meta: PaginationMeta
}

// ─── Cluster ─────────────────────────────────────────────────────────────────

export interface Cluster {
  id: number
  name: string
  description?: string
  status: string
  enabled: boolean
  managed: boolean
  zone?: { id: number; name: string }
  type?: { id: number; name: string }
  layout?: { id: number; name: string; provisionTypeCode: string }
  site?: { id: number; name: string }
  servers?: Array<{
    id: number
    name: string
    computeServerType?: { id: number; code: string; nodeType: string }
  }>
  workerStats?: {
    usedMemory: number
    maxMemory: number
    cpuUsage: number
  }
  workersCount?: number
  dateCreated: string
  lastUpdated: string
}

export interface ClustersResponse {
  clusters: Cluster[]
  meta: PaginationMeta
}

// ─── Server Group (legacy) ────────────────────────────────────────────────────

export interface ServerGroup {
  id: number
  name: string
  description?: string
  zone?: { id: number; name: string }
  servers: number[]
}

export interface ServerGroupsResponse {
  serverGroups: ServerGroup[]
  meta: PaginationMeta
}

// ─── Server / Host ────────────────────────────────────────────────────────────

export interface ComputeServer {
  id: number
  name: string
  displayName?: string
  description?: string
  hostname?: string
  externalIp?: string
  internalIp?: string
  status: string
  powerState?: string
  cloud?: { id: number; name: string; code: string }
  serverGroup?: { id: number; name: string }
  computeServerType?: {
    id: number
    name: string
    code: string
    nodeType?: string
  }
  plan?: { id: number; name: string; code: string }
  osType?: string
  osMorpheusType?: string
  stats?: ServerStats
  maxCores: number
  maxMemory: number
  usedMemory?: number
  maxStorage: number
  usedStorage?: number
  runningCount?: number
  totalCount?: number
  containers?: number[]
  dateCreated: string
  lastUpdated: string
  agentInstalled?: boolean
  managed?: boolean
  enabled?: boolean
}

export interface ServerStats {
  usedMemory: number
  reservedMemory: number
  maxMemory: number
  usedSwap?: number
  maxSwap?: number
  cpuUsage: number
  cpuUser?: number
  cpuSystem?: number
  maxStorage?: number
  usedStorage?: number
  iops?: number
}

export interface ServersResponse {
  servers: ComputeServer[]
  meta: PaginationMeta
}

// ─── Instance / VM ────────────────────────────────────────────────────────────

export interface ContainerNetworkInterface {
  id: number
  name?: string
  primaryInterface?: boolean
  network?: { id: number; name: string }
  ipAddress?: string
  ipSubnet?: string
}

export interface Container {
  id: number
  name: string
  hostname?: string
  ip?: string
  externalIp?: string
  internalIp?: string
  status: string
  powerState?: string
  server?: {
    id: number
    name: string
    cloud?: { id: number; name: string }
    serverGroup?: { id: number; name: string }
  }
  plan?: { id: number; name: string }
  maxCores: number
  maxMemory: number
  maxStorage: number
  coresPerSocket?: number
  stats?: ContainerStats
  interfaces?: ContainerNetworkInterface[]
  dateCreated?: string
  lastUpdated?: string
}

export interface ContainerStats {
  usedMemory: number
  maxMemory: number
  usedStorage: number
  maxStorage: number
  cpuUsage: number
  networkRxUsage?: number
  networkTxUsage?: number
  ts?: string
}

export interface Instance {
  id: number
  name: string
  description?: string
  displayName?: string
  status: PowerState
  statusMessage?: string
  cloud: { id: number; name: string; code: string }
  group?: { id: number; name: string }
  plan?: { id: number; name: string; code: string }
  instanceType?: { id: number; code: string; name: string }
  layout?: { id: number; name: string }
  containers: Container[]
  connectionInfo?: { ip?: string; port?: number }[]
  ip?: string
  hostName?: string
  environmentPrefix?: string
  tags?: Array<{ id: number; name: string; value?: string }>
  owner?: { id: number; username: string }
  createdBy?: { id: number; username: string }
  dateCreated: string
  lastUpdated: string
  stats?: ContainerStats
  maxCores?: number
  maxMemory?: number
  maxStorage?: number
  powerState?: string
  notes?: string
  userStatus?: string
}

export interface InstancesResponse {
  instances: Instance[]
  meta: PaginationMeta
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export interface Snapshot {
  id: number
  name: string
  description?: string
  status: string
  state?: string
  dataCreated: string
  dateCreated: string
  currentlyActive?: boolean
  snapshotCreated?: string
  externalId?: string
}

export interface SnapshotsResponse {
  snapshots: Snapshot[]
}

// ─── Stats (time-series) ─────────────────────────────────────────────────────

export interface StatPoint {
  time: string
  value: number
}

export interface InstanceStats {
  instanceId?: number
  usedMemory?: number
  maxMemory?: number
  usedStorage?: number
  maxStorage?: number
  cpuUsage?: number
  networkRxUsage?: number
  networkTxUsage?: number
  statsData?: {
    memory?: StatPoint[]
    cpu?: StatPoint[]
    networkRx?: StatPoint[]
    networkTx?: StatPoint[]
    disk?: StatPoint[]
  }
}

// ─── Task / History ───────────────────────────────────────────────────────────

export interface ProcessEvent {
  id: number
  refType?: string
  refId?: number
  processId?: number
  uniqueId?: string
  processType?: {
    code: string
    name: string
  }
  displayName?: string
  description?: string
  status: string
  reason?: string
  statusEta?: number
  percent?: number
  startDate?: string
  endDate?: string
  duration?: number
  dateCreated: string
  lastUpdated: string
  createdBy?: { id: number; username: string; displayName?: string }
}

export interface ProcessesResponse {
  processes: ProcessEvent[]
  meta: PaginationMeta
}

// ─── Network ──────────────────────────────────────────────────────────────────

export interface Network {
  id: number
  name: string
  displayName?: string
  code?: string
  description?: string
  zone?: { id: number; name: string }
  status?: string
  type?: { id: number; name: string; code: string }
  cidr?: string
  gateway?: string
  dhcpServer?: boolean
  vlanId?: number
  active?: boolean
}

export interface NetworksResponse {
  networks: Network[]
  meta: PaginationMeta
}

// ─── Data Store ───────────────────────────────────────────────────────────────

export interface DataStore {
  id: number
  name: string
  type: string
  storageSize?: number
  freeSpace?: number
  online?: boolean
  active?: boolean
  zone?: { id: number; name: string }
}

export interface DataStoresResponse {
  datastores: DataStore[]
}

// ─── Storage Volume ───────────────────────────────────────────────────────────

export interface StorageVolume {
  id: number
  name: string
  description?: string
  status?: string
  volumeType?: { id: number; name: string; code: string }
  zone?: { id: number; name: string }
  maxStorage: number
  usedStorage?: number
  freeStorage?: number
  active?: boolean
  refType?: string
}

export interface StorageVolumesResponse {
  storageVolumes: StorageVolume[]
  meta: PaginationMeta
}

// ─── Provision Options ────────────────────────────────────────────────────────

export interface ProvisionType {
  id: number
  name: string
  code: string
}

export interface ServicePlan {
  id: number
  name: string
  code: string
  maxCores?: number
  maxMemory?: number
  maxStorage?: number
  customCpu?: boolean
  customCores?: boolean
  customMaxMemory?: boolean
}

export interface Layout {
  id: number
  name: string
  code: string
  instanceType?: { id: number; code: string; name: string }
  provisionType?: { id: number; code: string; name: string }
}
