import { useState, memo, useCallback } from 'react'
import { Pipette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  presets?: string[]
}

const defaultPresets = [
  '#FFFFFF', '#000000', '#EF4444', '#F47B20',
  '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
]

const HEX_PATTERN = /^#[0-9a-fA-F]{0,6}$/

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

export const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
  label,
  presets = defaultPresets,
}: ColorPickerProps) {
  const [showHex, setShowHex] = useState(false)

  const pickEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper()
      const result = await dropper.open()
      if (result?.sRGBHex) onChange(result.sRGBHex)
    } catch {
      // User cancelled or API unavailable — silently ignore
    }
  }, [onChange])

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-xs font-medium text-white/70">{label}</span>
      )}
      <div className="flex items-center gap-2">
        {/* Current color + native picker */}
        <label
          className="w-8 h-8 rounded-lg border border-white/[0.12] cursor-pointer flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: value }}
          title="Custom color"
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-0 h-0"
          />
        </label>

        {/* Presets */}
        <div className="flex gap-1 flex-wrap">
          {presets.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`
                w-5 h-5 rounded-md border transition-all duration-150
                ${value === color ? 'border-white/50 scale-110' : 'border-white/[0.08] hover:border-white/20'}
              `}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Eyedropper */}
        {hasEyeDropper && (
          <button
            onClick={pickEyeDropper}
            className="flex items-center justify-center w-5 h-5 rounded text-white/30 hover:text-white/70 transition-colors"
            title="Pick color from screen"
          >
            <Pipette size={13} />
          </button>
        )}

        {/* Hex input toggle */}
        <button
          onClick={() => setShowHex(!showHex)}
          className="text-[10px] text-white/30 hover:text-white/60 ml-auto"
        >
          {showHex ? value : '#'}
        </button>
      </div>

      {showHex && (
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (HEX_PATTERN.test(v)) onChange(v)
          }}
          className="w-full px-2 py-1 text-xs bg-dark-surface border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-[#F47B20]/40"
          placeholder="#000000"
        />
      )}
    </div>
  )
})
