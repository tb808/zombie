import * as THREE from 'three';

// Poll immutable GL handles with cancellation. Three's material-based async
// compiler can keep polling disposed material properties after an effect reset.
export async function compileScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, cancelled: () => boolean) {
  renderer.compile(scene,camera);
  const gl=renderer.getContext(),extension=gl.getExtension('KHR_parallel_shader_compile');
  if(!extension)return;
  const programs=(renderer.info.programs??[]).map(entry=>entry.program).filter(Boolean);
  while(!cancelled()&&!gl.isContextLost()){
    if(programs.every(program=>gl.getProgramParameter(program,extension.COMPLETION_STATUS_KHR)))return;
    await new Promise<void>(resolve=>setTimeout(resolve,16));
  }
}

export function renderPixelRatio(width: number, height: number, deviceRatio: number, scale = 1) {
  return Math.min(Math.max(.5, deviceRatio), 1.25, Math.sqrt(1_600_000 / Math.max(1, width * height))) * scale;
}

// Sustained frame pressure changes resolution; one shader/upload spike must not
// resize the render buffers. Recovery is slower to avoid oscillation.
export class ResolutionBudget {
  scale = 1;
  averageMs = 16.7;
  private slow = 0;
  private fast = 0;
  private warmupMs = 0;
  sample(milliseconds: number, active: boolean) {
    if (!active || milliseconds < 1 || milliseconds > 1000) return false;
    this.averageMs += (Math.min(milliseconds,100) - this.averageMs) * .06;
    this.warmupMs+=milliseconds;
    if(this.warmupMs<1500)return false;
    this.slow = this.averageMs > 23 ? this.slow + milliseconds : 0;
    this.fast = this.averageMs < 17.3 ? this.fast + milliseconds : 0;
    if (this.slow >= 1000 && this.scale > .6) {
      this.scale = Math.max(.6, Math.round((this.scale - .1) * 10) / 10); this.slow = this.fast = 0; return true;
    }
    if (this.fast >= 12000 && this.scale < 1) {
      this.scale = Math.min(1, Math.round((this.scale + .1) * 10) / 10); this.slow = this.fast = 0; return true;
    }
    return false;
  }
}

// Sources retain their world positions and gameplay state. Only a fixed number
// of GPU lights is used, so entering a room or throwing a flare does not change
// NUM_POINT_LIGHTS and compile another complete set of material programs.
export function makeLocalLightPool(scene: THREE.Scene, count = 4) {
  const slots = Array.from({ length: count }, () => { const light = new THREE.PointLight(0xffffff, 0, 1, 2); scene.add(light); return light; });
  const ranked: { source: THREE.PointLight; score: number }[] = [];
  return {
    slots,
    update(sources: readonly THREE.PointLight[], camera: THREE.Vector3) {
      ranked.length = 0;
      for (const source of sources) {
        if (source.intensity <= .001) continue;
        const distanceSquared = source.position.distanceToSquared(camera), range = source.distance + 8;
        if (distanceSquared < range * range) ranked.push({ source, score: source.intensity / (distanceSquared + 4) });
      }
      ranked.sort((a, b) => b.score - a.score);
      slots.forEach((slot, index) => {
        const source = ranked[index]?.source;
        slot.intensity = source?.intensity ?? 0;
        if (source) { slot.position.copy(source.position); slot.color.copy(source.color); slot.distance = source.distance; slot.decay = source.decay; }
      });
    },
  };
}
