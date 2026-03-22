import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Square,
  RotateCcw,
  PauseCircle,
  Camera,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import {
  startInstance,
  stopInstance,
  restartInstance,
  suspendInstance,
} from '@/api/instances'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function ContextMenuContainer() {
  const { contextMenu, closeContextMenu } = useUiStore()
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [contextMenu, closeContextMenu])

  if (!contextMenu) return null

  const { x, y, instanceId, instanceName } = contextMenu

  const action = async (fn: () => Promise<unknown>, label: string) => {
    closeContextMenu()
    const toastId = toast.loading(`${label} ${instanceName}…`)
    try {
      await fn()
      toast.success(`${label} initiated`, { id: toastId })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      queryClient.invalidateQueries({ queryKey: ['instance', instanceId] })
    } catch {
      toast.error(`Failed to ${label.toLowerCase()}`, { id: toastId })
    }
  }

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <div
        className="px-3 py-2 text-2xs font-semibold"
        style={{ color: '#566278', borderBottom: '1px solid #1E2A45' }}
      >
        {instanceName}
      </div>

      <button
        className="context-menu-item w-full text-left"
        onClick={() => {
          closeContextMenu()
          navigate(`/vms/${instanceId}`)
        }}
      >
        <Info size={13} />
        Open Details
      </button>

      <div className="context-menu-separator" />

      <button
        className="context-menu-item w-full text-left"
        onClick={() => action(() => startInstance(instanceId), 'Power On')}
      >
        <Play size={13} style={{ color: '#00B388' }} />
        Power On
      </button>

      <button
        className="context-menu-item w-full text-left"
        onClick={() => action(() => stopInstance(instanceId), 'Power Off')}
      >
        <Square size={13} />
        Power Off
      </button>

      <button
        className="context-menu-item w-full text-left"
        onClick={() => action(() => restartInstance(instanceId), 'Restart')}
      >
        <RotateCcw size={13} />
        Restart
      </button>

      <button
        className="context-menu-item w-full text-left"
        onClick={() => action(() => suspendInstance(instanceId), 'Suspend')}
      >
        <PauseCircle size={13} />
        Suspend
      </button>

      <div className="context-menu-separator" />

      <button
        className="context-menu-item w-full text-left"
        onClick={() => {
          closeContextMenu()
          navigate(`/vms/${instanceId}?tab=snapshots`)
        }}
      >
        <Camera size={13} />
        Snapshots
      </button>

      <button
        className="context-menu-item w-full text-left"
        onClick={() => {
          closeContextMenu()
          window.open(`/api/instances/${instanceId}/console`, '_blank')
        }}
      >
        <ExternalLink size={13} />
        Open Console
      </button>

      <div className="context-menu-separator" />

      <button className="context-menu-item danger w-full text-left">
        <Trash2 size={13} />
        Delete VM
      </button>
    </div>
  )
}
