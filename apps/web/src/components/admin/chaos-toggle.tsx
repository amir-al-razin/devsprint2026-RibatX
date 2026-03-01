import { useState } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, Zap, X } from 'lucide-react'
import { gatewayApi } from '@/lib/api-client'
import { toast } from 'sonner'

export interface ChaosToggleProps {
  service: string
  currentStatus: 'ON' | 'OFF'
  onToggle: () => void
}

export function ChaosToggle({
  service,
  currentStatus,
  onToggle,
}: ChaosToggleProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const newMode = currentStatus === 'ON' ? 'OFF' : 'ON'
      await gatewayApi.toggleChaos({ service, mode: newMode })
      toast.success(`Chaos mode ${newMode} for ${service}`)
      onToggle()
      setShowModal(false)
    } catch (error: any) {
      toast.error('Failed to toggle chaos mode', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          'px-6 py-3 rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'active:scale-95 flex items-center gap-2',
          currentStatus === 'ON'
            ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
            : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
        )}
      >
        <Zap className="h-4 w-4" />
        Chaos: {currentStatus}
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              {/* Warning Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">
                  {currentStatus === 'ON' ? 'Disable' : 'Enable'} Chaos Mode?
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentStatus === 'ON' ? (
                    <>
                      This will restore normal operation for{' '}
                      <span className="font-semibold">{service}</span>.
                    </>
                  ) : (
                    <>
                      This will introduce random failures to{' '}
                      <span className="font-semibold">{service}</span>. Use with
                      caution!
                    </>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-lg border bg-background hover:bg-muted transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-lg font-medium transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    currentStatus === 'ON'
                      ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
                      : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
                    loading && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
