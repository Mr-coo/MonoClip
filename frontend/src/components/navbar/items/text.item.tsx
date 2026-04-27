import { FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify } from 'react-icons/fa6';
import { useTimelineStore } from '../../../store/timeline.store';
import { DEFAULT_MEDIA_ASSET_SETTINGS, MediaAsset } from '../../../types/mediaAsset';
import { DEFAULT_TEXT_STYLE, FONT_FAMILIES, FONT_WEIGHTS, TextStyle } from '../../../types/textStyle';
import ButtonOutlined from '../../buttons/button.outlined';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-typography/40 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-typography/50 w-14 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function SliderRow({ label, min, max, step = 1, value, onChange, unit = '' }: {
  label: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; unit?: string;
}) {
  return (
    <Row label={label}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="flex-1 accent-primary h-1 cursor-pointer"
      />
      <span className="text-xs text-typography/50 w-10 text-right shrink-0">
        {Number.isInteger(step) ? value : value.toFixed(1)}{unit}
      </span>
    </Row>
  );
}

export default function TextItem() {
  const assets = useTimelineStore(s => s.assets);
  const selectedAssetId = useTimelineStore(s => s.selectedAssetId);
  const currentTime = useTimelineStore(s => s.currentTime);
  const addAsset = useTimelineStore(s => s.addAsset);
  const updateAsset = useTimelineStore(s => s.updateAsset);

  const selectedAsset = assets.find(a => a.id === selectedAssetId && a.type === 'text') ?? null;
  const ts = selectedAsset?.textStyle ?? null;

  function update(patch: Partial<TextStyle>) {
    if (!selectedAsset) return;
    updateAsset(selectedAsset.id, {
      textStyle: { ...(selectedAsset.textStyle ?? DEFAULT_TEXT_STYLE), ...patch },
    });
  }

  function addText(fontSize: number, content: string) {
    const width = Math.min(1600, Math.max(600, fontSize * 10));
    const x = Math.round((1920 - width) / 2);
    const y = 460;
    const asset: MediaAsset = {
      ...DEFAULT_MEDIA_ASSET_SETTINGS,
      type: 'text',
      name: content,
      startTime: 0,
      endTime: 5,
      startInTimeLine: currentTime,
      x,
      y,
      width,
      height: Math.round(fontSize * 1.5),
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize, content },
    };
    addAsset(asset);
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <h2 className="text-2xl border-b-2 border-b-shadow w-full p-2">Text</h2>

      <div className="flex flex-col gap-2 p-2">
        <ButtonOutlined label="Add Heading"    fontSize={22} onClick={() => addText(120, 'Heading')} />
        <ButtonOutlined label="Add Subheading" fontSize={18} onClick={() => addText(80, 'Subheading')} />
        <ButtonOutlined label="Add Regular"    fontSize={14} onClick={() => addText(56, 'Regular text')} />
        <ButtonOutlined label="Add Detail"     fontSize={12} onClick={() => addText(36, 'Detail text')} />
      </div>

      {!ts && (
        <p className="text-xs text-typography/30 text-center mt-6 px-4">
          Select a text asset in the timeline to customize it
        </p>
      )}

      {ts && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 mt-2 flex flex-col gap-5 border-t border-white/10">

          {/* Content */}
          <Section title="Content">
            <textarea
              value={ts.content}
              onChange={e => update({ content: e.target.value })}
              rows={3}
              className="bg-shadow text-typography text-sm rounded p-2 w-full border border-white/10 resize-none focus:outline-none focus:border-primary/60"
            />
          </Section>

          {/* Typography */}
          <Section title="Typography">
            <Row label="Font">
              <select
                value={ts.fontFamily}
                onChange={e => update({ fontFamily: e.target.value })}
                className="flex-1 bg-shadow text-typography text-xs rounded px-1 py-1 border border-white/10 focus:outline-none"
              >
                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Row>
            <Row label="Size">
              <input
                type="number" min={8} max={500} value={ts.fontSize}
                onChange={e => update({ fontSize: +e.target.value })}
                className="w-20 bg-shadow text-typography text-xs rounded px-1 py-1 border border-white/10 focus:outline-none"
              />
              <span className="text-xs text-typography/40">px</span>
            </Row>
            <Row label="Weight">
              <select
                value={ts.fontWeight}
                onChange={e => update({ fontWeight: +e.target.value })}
                className="flex-1 bg-shadow text-typography text-xs rounded px-1 py-1 border border-white/10 focus:outline-none"
              >
                {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </Row>
            <SliderRow label="Spacing" min={-10} max={50} value={ts.letterSpacing} onChange={v => update({ letterSpacing: v })} unit="px" />
            <SliderRow label="Line H." min={0.5} max={4} step={0.1} value={ts.lineHeight} onChange={v => update({ lineHeight: v })} />
            <Row label="Align">
              {([
                { val: 'left',    Icon: FaAlignLeft },
                { val: 'center',  Icon: FaAlignCenter },
                { val: 'right',   Icon: FaAlignRight },
                { val: 'justify', Icon: FaAlignJustify },
              ] as const).map(({ val, Icon }) => (
                <button
                  key={val}
                  onClick={() => update({ textAlign: val })}
                  className={`flex-1 flex items-center justify-center p-1.5 rounded transition-colors ${ts.textAlign === val ? 'bg-primary text-white' : 'bg-white/10 text-typography/50 hover:bg-white/20'}`}
                >
                  <Icon size={11} />
                </button>
              ))}
            </Row>
          </Section>

          {/* Color */}
          <Section title="Color">
            <Row label="Mode">
              <button
                onClick={() => update({ gradient: null })}
                className={`flex-1 text-xs p-1 rounded transition-colors ${!ts.gradient ? 'bg-primary text-white' : 'bg-white/10 text-typography/50 hover:bg-white/20'}`}
              >Solid</button>
              <button
                onClick={() => update({ gradient: ts.gradient ?? { type: 'linear', fromColor: ts.color, toColor: '#f59e0b', angle: 90 } })}
                className={`flex-1 text-xs p-1 rounded transition-colors ${ts.gradient ? 'bg-primary text-white' : 'bg-white/10 text-typography/50 hover:bg-white/20'}`}
              >Gradient</button>
            </Row>

            {!ts.gradient ? (
              <Row label="Color">
                <input
                  type="color" value={ts.color}
                  onChange={e => update({ color: e.target.value })}
                  className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
                />
              </Row>
            ) : (
              <>
                <Row label="From">
                  <input type="color" value={ts.gradient.fromColor}
                    onChange={e => update({ gradient: { ...ts.gradient!, fromColor: e.target.value } })}
                    className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
                  />
                </Row>
                <Row label="To">
                  <input type="color" value={ts.gradient.toColor}
                    onChange={e => update({ gradient: { ...ts.gradient!, toColor: e.target.value } })}
                    className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
                  />
                </Row>
                <Row label="Type">
                  {(['linear', 'radial'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => update({ gradient: { ...ts.gradient!, type: t } })}
                      className={`flex-1 text-xs p-1 rounded capitalize transition-colors ${ts.gradient!.type === t ? 'bg-primary text-white' : 'bg-white/10 text-typography/50 hover:bg-white/20'}`}
                    >{t}</button>
                  ))}
                </Row>
                {ts.gradient.type === 'linear' && (
                  <SliderRow label="Angle" min={0} max={360} value={ts.gradient.angle}
                    onChange={v => update({ gradient: { ...ts.gradient!, angle: v } })} unit="°"
                  />
                )}
              </>
            )}

            <SliderRow label="Opacity" min={0} max={100} value={Math.round(ts.opacity * 100)}
              onChange={v => update({ opacity: v / 100 })} unit="%" />
          </Section>

          {/* Stroke */}
          <Section title="Stroke">
            <Row label="Color">
              <input type="color" value={ts.strokeColor}
                onChange={e => update({ strokeColor: e.target.value })}
                className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
              />
            </Row>
            <SliderRow label="Width" min={0} max={20} value={ts.strokeWidth}
              onChange={v => update({ strokeWidth: v })} unit="px" />
          </Section>

          {/* Shadow */}
          <Section title="Shadow">
            <Row label="Color">
              <input type="color" value={ts.shadowColor}
                onChange={e => update({ shadowColor: e.target.value })}
                className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
              />
            </Row>
            <SliderRow label="Opacity" min={0} max={100} value={Math.round(ts.shadowOpacity * 100)}
              onChange={v => update({ shadowOpacity: v / 100 })} unit="%" />
            <SliderRow label="X" min={-100} max={100} value={ts.shadowOffsetX}
              onChange={v => update({ shadowOffsetX: v })} unit="px" />
            <SliderRow label="Y" min={-100} max={100} value={ts.shadowOffsetY}
              onChange={v => update({ shadowOffsetY: v })} unit="px" />
            <SliderRow label="Blur" min={0} max={100} value={ts.shadowBlur}
              onChange={v => update({ shadowBlur: v })} unit="px" />
          </Section>

          {/* Background */}
          <Section title="Background">
            <Row label="Color">
              <input type="color" value={ts.bgColor}
                onChange={e => update({ bgColor: e.target.value })}
                className="w-8 h-7 rounded cursor-pointer border border-white/10 bg-shadow p-0.5"
              />
            </Row>
            <SliderRow label="Opacity" min={0} max={100} value={Math.round(ts.bgOpacity * 100)}
              onChange={v => update({ bgOpacity: v / 100 })} unit="%" />
            <SliderRow label="Padding" min={0} max={120} value={ts.bgPadding}
              onChange={v => update({ bgPadding: v })} unit="px" />
            <SliderRow label="Radius" min={0} max={100} value={ts.bgRadius}
              onChange={v => update({ bgRadius: v })} unit="px" />
          </Section>

        </div>
      )}
    </div>
  );
}