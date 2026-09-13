"use client";
// MidiService (03 §3): capture raw, normalize by profile — raw is what gets logged.
export interface RawNote { midi: number; onMs: number; vel: number; }
export interface DeviceProfile { id: string; name: string; transport: "USB"; latencyMs: number; jitterMs: number; velocityFloor: number; perfTrusted: boolean; }

type Listener = (n: RawNote) => void;
let access: MIDIAccess | null = null;
let listener: Listener | null = null;
let currentName: string | null = null;

export async function initMidi(onDevice: (name: string | null) => void): Promise<void> {
  if (!navigator.requestMIDIAccess) { onDevice(null); return; }
  access = await navigator.requestMIDIAccess();
  const wire = () => {
    const inputs = [...access!.inputs.values()];
    currentName = inputs[0] ? `${inputs[0].manufacturer ?? ""} ${inputs[0].name ?? ""}`.trim() : null;
    onDevice(currentName);
    for (const input of inputs) {
      input.onmidimessage = (e: MIDIMessageEvent) => {
        const d = e.data;
        if (!d || (d[0] & 0xf0) !== 0x90 || d[2] === 0) return;
        listener?.({ midi: d[1], onMs: e.timeStamp, vel: d[2] });
      };
    }
  };
  wire();
  access.onstatechange = wire;
}

export function onNote(fn: Listener | null): void { listener = fn; }
export function deviceName(): string | null { return currentName; }

/** v0 profile for the connected device — spike-measured defaults for the FP-90X (03 §3, log #73). */
export function defaultProfile(name: string): DeviceProfile {
  return { id: `p:${name}:USB`, name, transport: "USB", latencyMs: 25, jitterMs: 25, velocityFloor: 0, perfTrusted: true };
}
