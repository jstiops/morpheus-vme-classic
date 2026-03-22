import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/common/Modal'
import { listZones, listServicePlans, listLayouts, listNetworks } from '@/api/clouds'
import { createInstance } from '@/api/instances'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
}

type WizardStep = 'basics' | 'resources' | 'network' | 'review'
const STEPS: WizardStep[] = ['basics', 'resources', 'network', 'review']
const STEP_LABELS: Record<WizardStep, string> = {
  basics: 'Basics',
  resources: 'Resources',
  network: 'Network',
  review: 'Review',
}

export function VMCreateWizard({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<WizardStep>('basics')
  const [form, setForm] = useState({
    name: '',
    description: '',
    zoneId: '',
    planId: '',
    layoutId: '',
    networkId: '',
    hostname: '',
    storageGb: '50',
  })

  const { data: zonesData } = useQuery({
    queryKey: ['zones'],
    queryFn: listZones,
    staleTime: 60_000,
  })

  const { data: plansData } = useQuery({
    queryKey: ['plans', form.zoneId],
    queryFn: () => listServicePlans(form.zoneId ? Number(form.zoneId) : undefined),
    enabled: !!form.zoneId,
    staleTime: 60_000,
  })

  const { data: layoutsData } = useQuery({
    queryKey: ['layouts'],
    queryFn: () => listLayouts(),
    staleTime: 60_000,
  })

  const { data: networksData } = useQuery({
    queryKey: ['networks', form.zoneId],
    queryFn: () => listNetworks({ zoneId: form.zoneId ? Number(form.zoneId) : undefined }),
    enabled: !!form.zoneId,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const layout = layoutsData?.layouts?.find(
        (l: { id: number }) => l.id === Number(form.layoutId),
      )
      return createInstance({
        instance: {
          name: form.name,
          description: form.description,
          zone: { id: Number(form.zoneId) },
          instanceType: { code: layout?.instanceType?.code ?? 'morpheus' },
          plan: { id: Number(form.planId) },
          layout: { id: Number(form.layoutId) },
          hostName: form.hostname || form.name,
        },
        networkInterfaces: form.networkId
          ? [{ network: { id: Number(form.networkId) } }]
          : undefined,
        volumes: [
          {
            name: 'root',
            rootVolume: true,
            size: Number(form.storageGb),
          },
        ],
      })
    },
    onSuccess: () => {
      toast.success(`VM "${form.name}" is being provisioned`)
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      onClose()
    },
    onError: () => {
      toast.error('Failed to create VM. Check your configuration.')
    },
  })

  const update = (key: keyof typeof form, val: string) =>
    setForm((f) => ({ ...f, [key]: val }))

  const stepIdx = STEPS.indexOf(step)
  const canNext =
    step === 'basics'
      ? form.name.length > 0 && form.zoneId !== ''
      : step === 'resources'
        ? form.planId !== '' && form.layoutId !== ''
        : true

  const zones = zonesData?.zones ?? []
  const plans = plansData?.servicePlans ?? []
  const layouts = layoutsData?.layouts ?? []
  const networks = networksData?.networks ?? []

  return (
    <Modal
      title="Create New Virtual Machine"
      onClose={onClose}
      width={600}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {stepIdx > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => setStep(STEPS[stepIdx - 1])}
            >
              Back
            </button>
          )}
          {step !== 'review' ? (
            <button
              className="btn btn-primary"
              disabled={!canNext}
              onClick={() => setStep(STEPS[stepIdx + 1])}
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name || !form.zoneId || !form.planId || !form.layoutId}
            >
              {mutation.isPending ? 'Creating…' : 'Create VM'}
            </button>
          )}
        </>
      }
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <button
              className="flex flex-col items-center gap-1 flex-1"
              onClick={() => {
                if (i < stepIdx) setStep(s)
              }}
              disabled={i > stepIdx}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
                style={{
                  background:
                    s === step
                      ? '#00B388'
                      : i < stepIdx
                        ? 'rgba(0,179,136,0.3)'
                        : '#1E2A45',
                  color: s === step ? '#000' : i < stepIdx ? '#00B388' : '#566278',
                }}
              >
                {i + 1}
              </div>
              <span
                className="text-2xs"
                style={{ color: s === step ? '#00B388' : '#566278' }}
              >
                {STEP_LABELS[s]}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className="h-px flex-1 mb-4"
                style={{ background: i < stepIdx ? 'rgba(0,179,136,0.3)' : '#1E2A45' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'basics' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              VM Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              className="input"
              placeholder="my-vm-001"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Description
            </label>
            <input
              className="input"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Hostname
            </label>
            <input
              className="input"
              placeholder="Defaults to VM name"
              value={form.hostname}
              onChange={(e) => update('hostname', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Datacenter / Cloud <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              className="input"
              value={form.zoneId}
              onChange={(e) => update('zoneId', e.target.value)}
            >
              <option value="">Select a datacenter…</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {step === 'resources' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Service Plan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              className="input"
              value={form.planId}
              onChange={(e) => update('planId', e.target.value)}
            >
              <option value="">Select a plan…</option>
              {plans.map((p: { id: number; name: string; maxCores?: number; maxMemory?: number }) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.maxCores ? ` — ${p.maxCores} vCPU` : ''}
                  {p.maxMemory ? ` · ${(p.maxMemory / 1024 / 1024 / 1024).toFixed(0)} GB RAM` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Layout <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              className="input"
              value={form.layoutId}
              onChange={(e) => update('layoutId', e.target.value)}
            >
              <option value="">Select a layout…</option>
              {layouts.map((l: { id: number; name: string }) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Root Disk Size (GB)
            </label>
            <input
              className="input"
              type="number"
              min="10"
              max="10000"
              value={form.storageGb}
              onChange={(e) => update('storageGb', e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 'network' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
              Network
            </label>
            <select
              className="input"
              value={form.networkId}
              onChange={(e) => update('networkId', e.target.value)}
            >
              <option value="">Auto-select network</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}{n.cidr ? ` (${n.cidr})` : ''}
                </option>
              ))}
            </select>
          </div>
          {networks.length === 0 && form.zoneId && (
            <p className="text-xs" style={{ color: '#566278' }}>
              No networks found for this datacenter. A default will be assigned.
            </p>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3">
          <p className="text-xs mb-4" style={{ color: '#8B9AB0' }}>
            Review your configuration before creating the VM.
          </p>
          {[
            ['Name', form.name],
            ['Description', form.description || '—'],
            ['Hostname', form.hostname || form.name],
            ['Datacenter', zones.find((z) => String(z.id) === form.zoneId)?.name ?? '—'],
            ['Plan', plans.find((p: { id: number; name: string }) => String(p.id) === form.planId)?.name ?? '—'],
            ['Layout', layouts.find((l: { id: number; name: string }) => String(l.id) === form.layoutId)?.name ?? '—'],
            ['Network', networks.find((n) => String(n.id) === form.networkId)?.name ?? 'Auto'],
            ['Storage', `${form.storageGb} GB`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between py-2 text-sm"
              style={{ borderBottom: '1px solid #1E2A45' }}
            >
              <span style={{ color: '#566278' }}>{label}</span>
              <span className="font-medium text-white">{value}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
