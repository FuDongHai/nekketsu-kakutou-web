(function (root) {
  'use strict';

  const bounds = {left: 84, right: 1196, top: 421, bottom: 600};
  const stages = [
    {name:'工厂擂台', threat:1, roster:[['山石', 72, 'yama']], damage:8, pace:108, rate:1.62},
    {name:'电网工厂', threat:2, roster:[['阿力', 86, 'riki'], ['柴田', 95, 'shibata']], damage:10, pace:121, rate:1.49},
    {name:'仓库平台', threat:3, roster:[['一条', 107, 'ichijou'], ['御堂', 108, 'midou'], ['柴田', 112, 'shibata']], damage:11, pace:143, rate:1.36},
    {name:'天台擂场', threat:4, roster:[['御堂', 132, 'midou'], ['阿力', 150, 'riki']], damage:14, pace:165, rate:1.22},
    {name:'虎面决战', threat:5, roster:[['金虎', 175, 'tiger1'], ['银虎', 175, 'tiger2']], damage:17, pace:180, rate:1.12}
  ];
  const moves = {
    punch: {label:'拳', damage:15, range:91, depth:39, wind:.13, duration:.33, cooldown:.32, push:16, color:'#fff2ca', kind:'punch'},
    kick:  {label:'脚', damage:21, range:112, depth:45, wind:.15, duration:.43, cooldown:.41, push:38, color:'#fff2ca', kind:'kick'},
    dash:  {label:'马赫踢', damage:30, range:128, depth:54, wind:.10, duration:.46, cooldown:1.65, push:26, color:'#fff2ca', kind:'mach', repeat:.18},
    dragon:{label:'旋转攻击', damage:34, range:128, depth:61, wind:.18, duration:.59, cooldown:2.5, push:44, color:'#f9dd83', kind:'spin', area:true, jump:true},
    flame: {label:'爆裂踢', damage:47, range:143, depth:57, wind:.22, duration:.66, cooldown:3.7, push:97, color:'#ffbd74', kind:'burst', advance:56}
  };
  const ultimates = {
    ice:  {label:'冰冻合击', glyph:'冰', description:'双向夹击，冰晶封住近身敌人。', damage:63, range:204, depth:109, wind:.35, duration:1.03, cooldown:14, push:28, color:'#86eeff', kind:'ice', area:true, freeze:1.75, ultimate:true},
    volt: {label:'电磁合击', glyph:'电', description:'双人同步突进，电弧贯穿正面。', damage:77, range:233, depth:71, wind:.31, duration:.88, cooldown:13, push:125, color:'#dfabff', kind:'volt', advance:101, ultimate:true},
    wind: {label:'旋风合击', glyph:'风', description:'搭档交错回旋，把周围对手卷上空中。', damage:69, range:232, depth:129, wind:.38, duration:1.04, cooldown:15, push:98, color:'#8bffd2', kind:'wind', area:true, lift:1, ultimate:true},
    fire: {label:'火焰合击', glyph:'火', description:'双重冲拳引爆火浪，造成最高伤害。', damage:93, range:186, depth:105, wind:.43, duration:1.13, cooldown:16, push:139, color:'#ff8c55', kind:'fire', area:true, ultimate:true}
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a,b) => Math.hypot(a.x-b.x,(a.y-b.y)*1.6);
  function fighter(name,x,y,maxHp,palette,boss=false) {
    return {name,x,y,hp:maxHp,maxHp,palette,boss,face:initialDirection(x),cooldown:{},attack:null,stun:0,flash:0,lift:0, air:0,
      invincible:0,step:0,moving:false,push:0,wait:0,bursts:0};
  }
  function initialDirection(x) { return x < 640 ? 1 : -1; }

  class Campaign {
    constructor(stage, emit=()=>{}, ultimate='ice') {
      this.index = stage;
      this.stage = stages[stage];
      this.emit = emit;
      this.ultimate = ultimates[ultimate] || ultimates.ice;
      this.player = fighter('国夫',279,519,180,'kunio');
      this.enemies = this.stage.roster.map(([name,hp,palette],i) =>
        fighter(name,805 + i*123, [516,447,573][i],hp,palette,stage===4));
      this.enemies.forEach((enemy,i) => {enemy.wait = .55 + i*.36;});
      this.result = '';
      this.combo = 0;
      this.comboTime = 0;
    }

    use(key) {
      if (key === 'jump') {
        if (this.result || this.player.attack || this.player.stun > 0 || this.player.air > 0) return false;
        this.player.air = .59;
        return true;
      }
      const move = key === 'ultimate' ? this.ultimate : moves[key];
      const p = this.player;
      if (!move || this.result || p.attack || p.stun > 0 || p.cooldown[key] > 0) return false;
      const target = this.enemies.filter(e => e.hp > 0).sort((a,b) => distance(p,a)-distance(p,b))[0];
      if (target && distance(p,target) < 248) p.face = Math.sign(target.x-p.x) || p.face;
      p.attack = {time:0, move, fired:false, repeated:false};
      if (move.jump && p.air <= 0) p.air = move.duration;
      p.cooldown[key] = move.cooldown;
      if (move.ultimate) p.invincible = move.duration;
      this.emit('attack',p,move);
      return true;
    }

    resolve(actor, move, targets) {
      if (move.advance) {
        const ahead = targets.filter(target => target.hp > 0 && Math.abs(target.y-actor.y) <= move.depth)
          .map(target => (target.x-actor.x)*actor.face).filter(gap => gap >= 0);
        const step = clamp(Math.min(...ahead)-45,0,move.advance);
        actor.x = clamp(actor.x + actor.face*step,bounds.left,bounds.right);
      }
      this.emit('strike',actor,move);
      for (const target of targets) {
        if (target.hp <= 0 || target.invincible > 0) continue;
        const dx = target.x-actor.x;
        if (Math.abs(dx) > move.range || (!move.area && dx*actor.face < -28) || Math.abs(target.y-actor.y) > move.depth) continue;
        target.hp = Math.max(0,target.hp - move.damage);
        target.stun = target === this.player ? .32 : (move.freeze || (move.lift ? .66 : .23));
        target.invincible = target === this.player ? .63 : .09;
        if (!target.boss || move.lift || move.area || target.attack?.fired) target.attack = null;
        target.flash = .18;
        target.push = (Math.sign(dx) || actor.face)*move.push*7;
        if (move.lift) target.lift = .62;
        if (move.freeze) target.frozen = move.freeze;
        if (actor === this.player) {
          this.combo = this.comboTime > 0 ? this.combo+1 : 1;
          this.comboTime = 1.55;
        } else {
          this.combo = 0;
          this.comboTime = 0;
        }
        this.emit('hit',target,move);
      }
    }

    tick(dt, horizontal=0, vertical=0) {
      if (this.result) return;
      const p = this.player;
      const foes = this.enemies.filter(e => e.hp > 0);
      this.comboTime -= dt;
      for (const actor of [p,...this.enemies]) {
        actor.moving = false;
        actor.stun -= dt;
        actor.flash -= dt;
        actor.lift = Math.max(0,actor.lift-dt);
        actor.air = Math.max(0,actor.air-dt);
        actor.frozen = Math.max(0,(actor.frozen || 0)-dt);
        actor.wait -= dt;
        actor.invincible -= dt;
        actor.x += actor.push*dt;
        actor.push *= Math.pow(.002,dt);
        for (const key of Object.keys(actor.cooldown)) actor.cooldown[key] = Math.max(0,actor.cooldown[key]-dt);
      }
      if ((!p.attack || p.air > 0) && p.stun <= 0 && (horizontal || vertical)) {
        const magnitude = Math.max(1,Math.hypot(horizontal,vertical));
        p.x += horizontal/magnitude*264*dt;
        p.y += vertical/magnitude*194*dt;
        if (Math.abs(horizontal) > .12) p.face = Math.sign(horizontal);
        p.moving = true;
      }

      foes.forEach((enemy,i) => {
        if (enemy.stun > 0 || enemy.attack || p.hp <= 0) return;
        const dx = p.x-enemy.x;
        const dy = p.y-enemy.y;
        const ranged = this.index >= 3 && enemy.bursts % 3 === 2;
        const heavy = this.index >= 2 && enemy.bursts % 3 === 1;
        const reach = ranged ? 179 : heavy ? 130 : 91;
        const depth = ranged ? 68 : 36;
        enemy.face = Math.sign(dx) || enemy.face;
        if (Math.abs(dx) < reach-10 && Math.abs(dy) < depth-7) {
          if (enemy.wait <= 0) {
            const move = {label:ranged ? '马赫踢' : heavy ? '脚' : '拳', range:reach, depth, wind:ranged ? .54 : heavy ? .43 : .30,
              duration:ranged ? .91 : .62, push:heavy ? 87 : 43, damage:this.stage.damage + (ranged ? 6 : 0),
              color:'#fff2ca', kind:ranged ? 'mach' : heavy ? 'kick' : 'punch'};
            enemy.bursts++;
            enemy.wait = this.stage.rate + i*.095;
            enemy.attack = {time:0,move,fired:false};
            this.emit('warning',enemy,move);
          }
          return;
        }
        enemy.x += clamp(dx,-85,85)/85*this.stage.pace*dt;
        enemy.y += clamp(dy,-48,48)/48*this.stage.pace*.76*dt;
        enemy.moving = true;
      });

      for (const actor of [p,...foes]) {
        if (actor.hp <= 0) { actor.attack = null; continue; }
        if (actor.moving) actor.step += dt*12;
        if (actor.attack) {
          const attack = actor.attack;
          attack.time += dt;
          if (!attack.fired && attack.time >= attack.move.wind) {
            attack.fired = true;
            this.resolve(actor,attack.move,actor === p ? foes : [p]);
          }
          if (attack.move.repeat && attack.fired && !attack.repeated && attack.time >= attack.move.wind+attack.move.repeat) {
            attack.repeated = true;
            this.resolve(actor,{...attack.move,damage:Math.round(attack.move.damage*.45)},actor===p?foes:[p]);
          }
          if (attack.time >= attack.move.duration) actor.attack = null;
        }
      }
      // Keep nearby fighters from occupying the same spot.
      const living = [p,...foes.filter(e => e.hp > 0)];
      for (let i=0;i<living.length;i++) for (let j=i+1;j<living.length;j++) {
        const a=living[i], b=living[j];
        const gap=b.x-a.x;
        if (Math.abs(gap) < 42 && Math.abs(a.y-b.y) < 27) {
          const nudge=(42-Math.abs(gap))*.5*(Math.sign(gap)||1);
          a.x-=nudge;
          b.x+=nudge;
        }
      }
      for(const actor of [p,...this.enemies]) {
        actor.x=clamp(actor.x,bounds.left,bounds.right);
        actor.y=clamp(actor.y,bounds.top,bounds.bottom);
      }
      if (p.hp<=0) this.result='defeat';
      else if (!this.enemies.some(e=>e.hp>0)) this.result='victory';
    }
  }

  const api = {Campaign, stages, moves, ultimates, distance};
  if (typeof module === 'object') module.exports=api;
  else root.Fighting=api;
})(globalThis);
