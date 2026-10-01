import * as THREE from 'three';
import { ZOMBIES, type Brain, type ZombieKind } from './survival.ts';

type Actions = { idle: THREE.AnimationAction; run: THREE.AnimationAction };
/** Retains the licensed rig/locomotion clips and layers authored joint poses.
 * Locomotion phase advances by measured displacement, never intended speed. */
export class ZombieAnimator {
  private joints: { bone: THREE.Object3D; clean: THREE.Quaternion }[] = [];
  private gait = 0;
  private blend = 0;
  private lean = 0;
  private prone = 0;
  private death = 0;
  private baseY: number;
  constructor(private model: THREE.Group, private mixer: THREE.AnimationMixer, private actions: Actions, private kind: ZombieKind, private phase: number) {
    this.baseY = model.position.y;
    for (const name of ['Spine', 'Chest', 'Head', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']) {
      const bone = model.getObjectByName(name); if (bone) this.joints.push({ bone, clean: bone.quaternion.clone() });
    }
    actions.idle.reset().setEffectiveWeight(1).play(); actions.run.reset().setEffectiveWeight(0).play();
  }
  update(dt: number, brain: Brain, distance: number, elapsed: number) {
    for (const j of this.joints) j.bone.quaternion.copy(j.clean);
    const speed = distance / Math.max(dt, .001), moving = speed > .03;
    this.gait += distance * (this.kind === 'crawler' ? 7 : 5.2) / ZOMBIES[this.kind].scale;
    this.blend = THREE.MathUtils.damp(this.blend, moving ? Math.min(1, .35 + speed / 5) : 0, 10, dt);
    this.actions.run.setEffectiveWeight(this.blend);
    this.actions.idle.setEffectiveWeight(1 - this.blend);
    this.actions.run.timeScale = moving ? speed / (3.2 * ZOMBIES[this.kind].scale) : 0;
    this.mixer.update(dt);
    for (const j of this.joints) j.clean.copy(j.bone.quaternion);
    const joint = (name: string, x: number, y = 0, z = 0) => { const bone = this.joints.find(j => j.bone.name === name)?.bone; if (bone) bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))); };
    const sway = Math.sin(this.gait + this.phase), breathing = Math.sin(elapsed * 1.8 + this.phase);
    const attacking = brain.state === 'attack';
    const strike = attacking ? Math.sin((1 - Math.max(0, brain.time) / ZOMBIES[this.kind].windup) * Math.PI) : 0;
    const hurt = brain.state === 'hit' ? Math.sin(Math.min(1, brain.time / .45) * Math.PI) : 0;
    const fallen = ['feed', 'fall'].includes(brain.state) || this.kind === 'crawler';
    const rise = brain.state === 'rise' ? Math.max(0, brain.time / 1.5) : 0;
    this.prone = THREE.MathUtils.damp(this.prone, fallen ? 1 : rise, 7, dt);
    this.lean = THREE.MathUtils.damp(this.lean, attacking ? strike * .27 : brain.state === 'notice' ? -.13 : .04 + this.blend * .08, 12, dt);
    joint('Spine', .15 + this.lean - hurt * .3, 0, sway * .05 * this.blend);
    joint('Head', -.08 + breathing * .025, brain.state === 'search' ? Math.sin(elapsed * 2) * .5 : sway * .06, this.kind === 'infected' ? Math.sin(elapsed * 19) * .07 : .05);
    joint('LeftArm', -.35 - strike * 1.1 + sway * .14, 0, -.12);
    joint('RightArm', -.42 - strike * 1.35 - sway * .17, 0, .13);
    joint('LeftForeArm', -.18 - strike * .5); joint('RightForeArm', -.25 - strike * .6);
    if (this.prone > .02) {
      joint('LeftUpLeg', .2, 0, .2); joint('RightUpLeg', -.15, 0, -.2);
      joint('LeftLeg', .55 + sway * .15); joint('RightLeg', .8 - sway * .15);
      joint('LeftArm', -.7 + sway * .55); joint('RightArm', -.7 - sway * .55);
      joint('Head', -.6);
    }
    if (brain.state === 'dead') this.death = Math.min(1, this.death + dt / .85);
    const easedDeath = this.death * this.death * (3 - 2 * this.death);
    const deathSide = Math.sin(this.phase) < 0 ? -1 : 1;
    this.model.rotation.x = this.prone * 1.37 + (this.phase % 3 < 2 ? easedDeath * 1.5 * (this.phase % 3 < 1 ? -1 : 1) * (1-this.prone) : 0);
    this.model.rotation.z = this.phase % 3 >= 2 ? easedDeath * deathSide * 1.5 : hurt * .13;
    this.model.position.y = this.baseY + this.prone * .38 + easedDeath * .22;
    if (brain.state === 'dead') { joint('LeftLeg', easedDeath * .65); joint('RightArm', easedDeath * .6); }
  }
}
