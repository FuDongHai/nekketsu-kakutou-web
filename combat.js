(function (root) {
  'use strict';

  const bounds = {left: 84, right: 1196, top: 421, bottom: 600};
  const stages = [
    {name:'工厂擂台', threat:1, roster:['yama'], damage:8, pace:108, rate:1.62},
    {name:'电网工厂', threat:2, roster:['riki','shibata'], damage:10, pace:121, rate:1.49},
    {name:'仓库平台', threat:3, roster:['ishizuki','midou','shibata'], damage:11, pace:143, rate:1.36},
    {name:'天台擂场', threat:4, roster:['midou','riki'], damage:14, pace:165, rate:1.22},
    {name:'虎面决战', threat:5, roster:['tiger1','tiger2'], damage:17, pace:180, rate:1.12}
  ];
  const jobs = {
    fighter:{name:'格斗家',element:'ice'}, boxer:{name:'拳击家',element:'volt'},
    kungfu:{name:'功夫家',element:'wind'}, judo:{name:'柔道家',element:'fire'},
    tiger:{name:'虎面兄弟',element:'ice'}
  };
  function character(name,kana,job,hp,row,...skills){return {name,kana,job,hp,row,skills};}
  // Order and life totals follow the Japanese cartridge's level-one status screens.
  const characters = {
    kunio:character('国夫','くにお','fighter',198,0,'spin','burst','mach'),
    shibata:character('柴田','しばた','fighter',190,1,'stomp','tornado','highKick'),
    ishizuki:character('石月','いしづき','fighter',179,3,'rapidPunch','tornado','highKick'),
    yama:character('山石','やまいし','fighter',175,7,'guillotine','highKick'),
    riki:character('阿力','りき','boxer',204,2,'spin','rapidPunch','tornado'),
    ebihara:character('海老原','えびはら','boxer',198,8,'elbow','burst'),
    mashiba:character('真柴','ましば','boxer',188,9,'rapidPunch','tornado','highKick'),
    jinnai:character('阵内','じんない','boxer',169,10,'highKick'),
    himeyama:character('姬山','ひめやま','kungfu',202,11,'burst','mach'),
    raidou:character('赖堂','らいどう','kungfu',175,12,'tornado','highKick'),
    aoi:character('青井','あおい','kungfu',171,13,'spin','burst','highKick'),
    anzawa:character('安泽','あんざわ','kungfu',178,14,'spin','rapidPunch','tornado'),
    midou:character('御堂','みどう','judo',203,4,'guard','spin','burst'),
    fujikura:character('藤仓','ふじくら','judo',206,15,'highKick'),
    suga:character('须贺','すが','judo',194,16,'spin','rapidPunch','tornado'),
    ookuma:character('大熊','おおくま','judo',190,17,'spin','mach'),
    tiger1:character('虎一','とらいち','tiger',255,5,'spin','burst','mach'),
    tiger2:character('虎二','とらじ','tiger',254,6,'spin','rapidPunch','tornado')
  };
  // Opening opponent vitality sampled in the cartridge's default versus battle.
  const opponentLife={shibata:185,ishizuki:174,yama:170,riki:200,ebihara:192,
    mashiba:181,jinnai:166,himeyama:196,raidou:171,aoi:168,anzawa:175,midou:195,
    fujikura:198,suga:190,ookuma:185,tiger1:255,tiger2:250};
  const timingGauge={max:18,first:6,last:12};
  const basic = {range:100, depth:45, wind:.14, duration:.38, cooldown:.4, push:26, color:'#fff2ca'};
  function technique(kind,label,glyph,damage,params){
    return {...basic,kind,label,glyph,damage,...params};
  }
  const moves = {
    punch:technique('punch','拳','拳',15,{range:91,depth:39,wind:.13,duration:.33,cooldown:.32,push:16}),
    kick:technique('kick','脚','脚',21,{range:112,wind:.15,duration:.43,cooldown:.41,push:38})
  };
  const techniques = {
    spin:technique('spin','旋转攻击','旋',34,{range:128,depth:61,wind:.18,duration:.59,cooldown:2.5,push:44,area:true,jump:true}),
    burst:technique('burst','爆裂踢','爆',47,{range:143,depth:57,wind:.22,duration:.66,cooldown:3.7,push:97,advance:56}),
    mach:technique('mach','马赫踢','速',25,{range:128,depth:54,wind:.10,duration:.49,cooldown:1.65,repeat:.12,hits:3}),
    stomp:technique('stomp','马赫踩踏','踏',22,{range:100,wind:.24,duration:.69,cooldown:2.5,jump:true,repeat:.13,hits:3}),
    tornado:technique('tornado','龙卷攻击','卷',37,{range:142,depth:67,wind:.19,duration:.64,cooldown:2.8,area:true,advance:68,lift:true}),
    highKick:technique('highKick','高旋踢','踢',33,{range:144,depth:49,wind:.17,duration:.51,cooldown:2.0,lift:true}),
    rapidPunch:technique('rapidPunch','马赫拳','连',19,{range:106,wind:.08,duration:.43,cooldown:1.4,repeat:.10,hits:3}),
    guillotine:technique('guillotine','跳跃断头踢','断',42,{range:130,wind:.34,duration:.7,cooldown:3.1,advance:74,jump:true,push:83}),
    elbow:technique('elbow','跳跃肘击','肘',38,{range:103,depth:51,wind:.29,duration:.62,cooldown:2.6,advance:68,jump:true}),
    guard:technique('guard','石化防御','守',0,{range:0,wind:0,duration:.94,cooldown:3.5})
  };
  const slots=['skill1','skill2','skill3'];
  const ultimates = {
    ice:  {label:'冰冻合击', glyph:'冰', description:'化为冰球，击中时冻结对手。', push:28, freeze:1.75, color:'#86eeff', kind:'ice'},
    volt: {label:'电磁合击', glyph:'电', description:'化为电球，碰撞时使对手麻痹。', push:56, shock:1.0, color:'#e7d2ff', kind:'volt'},
    wind: {label:'旋风合击', glyph:'风', description:'化为旋风，撞中后将对手卷起。', push:98, lift:true, color:'#8bffd2', kind:'wind'},
    fire: {label:'火焰合击', glyph:'火', description:'化为火球，撞飞对手并留下火花。', push:139, burn:.70, color:'#ff8c55', kind:'fire'}
  };
  for(const move of Object.values(ultimates))Object.assign(move,{damage:57,range:96,depth:49,area:true,ultimate:true,cooldown:12});
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a,b) => Math.hypot(a.x-b.x,(a.y-b.y)*1.6);
  function fighter(id,x,y,maxHp=characters[id].hp) {
    const {name,skills,job}=characters[id];
    const palette=id,boss=job==='tiger';
    return {name,skills,x,y,hp:maxHp,maxHp,palette,boss,face:initialDirection(x),cooldown:{},attack:null,stun:0,flash:0,lift:0, air:0,
      invincible:0,step:0,moving:false,push:0,wait:0,bursts:0};
  }
  function initialDirection(x) { return x < 640 ? 1 : -1; }

  class Campaign {
    constructor(stage, emit=()=>{}, ultimate='ice',hero='kunio') {
      this.index = stage;
      this.stage = stages[stage];
      this.emit = emit;
      this.ultimate = ultimates[ultimate] || ultimates.ice;
      this.player = fighter(hero,279,519);
      this.enemies = this.stage.roster.map((id,i)=>fighter(id,805+i*123,[516,447,573][i],opponentLife[id]));
      this.team=null;
      this.enemies.forEach((enemy,i) => {enemy.wait = .55 + i*.36;});
      this.result = '';
      this.combo = 0;
      this.comboTime = 0;
    }

    moveFor(key,actor=this.player) {
      if(key==='ultimate')return this.ultimate;
      return moves[key] || techniques[actor.skills[slots.indexOf(key)]];
    }

    use(key) {
      if(this.result)return false;
      if(this.team){
        if(this.team.phase==='aim' && (key==='ultimate'||key==='punch'))return this.throwPartner();
        return false;
      }
      if (key === 'jump') {
        if (this.result || this.player.attack || this.player.stun > 0 || this.player.air > 0) return false;
        this.player.air = this.player.airDuration = .59;
        return true;
      }
      const move = this.moveFor(key);
      const p = this.player;
      if (!move || this.result || p.attack || p.stun > 0 || p.cooldown[key] > 0) return false;
      const target = this.enemies.filter(e => e.hp > 0).sort((a,b) => distance(p,a)-distance(p,b))[0];
      if (target && distance(p,target) < 248) p.face = Math.sign(target.x-p.x) || p.face;
      if(move.ultimate){
        // A virtual second controller supplies the partner and its timed input.
        const partnerId=p.palette==='tiger1'?'tiger2':p.palette==='tiger2'?'tiger1':p.palette==='riki'?'kunio':'riki';
        const partner=fighter(partnerId,clamp(p.x-p.face*88,bounds.left,bounds.right),p.y);
        partner.face=p.face;
        this.team={phase:'mount',time:0,partner,move,meter:0,flight:0,height:0,face:p.face,seen:new Set()};
        p.invincible=1.7;
        this.emit('attack',p,move);
        return true;
      }
      p.attack = {time:0, move, fired:false, hitCount:0};
      if(move.kind==='guard')p.invincible=move.duration;
      if (move.jump && p.air <= 0) p.air = p.airDuration = move.duration;
      p.cooldown[key] = move.cooldown;
      this.emit('attack',p,move);
      return true;
    }

    throwPartner() {
      const t=this.team;
      if(!t||t.phase!=='aim')return false;
      const good=t.meter>=timingGauge.first && t.meter<=timingGauge.last;
      t.phase=good?'flight':'miss';
      t.time=0;
      this.player.cooldown.ultimate=good?t.move.cooldown:2;
      if(good){
        t.face=this.player.face;
        this.player.invincible=3.5;
        this.emit('launch',this.player,t.move);
      }else{
        this.player.invincible=0;
        this.player.stun=.52;
        this.emit('miss',this.player,t.move);
      }
      return true;
    }

    advanceTeam(dt) {
      const t=this.team,p=this.player;
      if(!t)return;
      t.time+=dt;
      if(t.phase==='mount'){
        t.partner.x=clamp(p.x-t.face*88*(1-Math.min(1,t.time/.38)),bounds.left,bounds.right);
        if(t.time>=.38){t.phase='aim';t.time=0;}
      }else if(t.phase==='aim'){
        t.meter=Math.round(timingGauge.max*(1-Math.abs(1-(t.time*1.3)%2)));
        if(t.meter>=10)this.throwPartner();
      }else if(t.phase==='flight'){
        t.flight+=dt;
        // Both partners move as one elemental sprite after the rolling launch.
        // The native powered arc is airborne for about 81 NTSC frames.
        const arc=Math.min(1,t.flight/(81/60));
        t.height=Math.round(76*4*arc*(1-arc));
        const targets=this.enemies.filter(enemy=>enemy.hp>0 && !t.seen.has(enemy));
        const nearest=targets.sort((a,b)=>distance(p,a)-distance(p,b))[0];
        if(nearest){
          t.face=Math.sign(nearest.x-p.x)||t.face;
          p.x+=clamp(nearest.x-p.x,-380*dt,380*dt);
          p.y+=clamp(nearest.y-p.y,-110*dt,110*dt);
        }else p.x=clamp(p.x+t.face*215*dt,bounds.left,bounds.right);
        p.face=t.face;
        t.partner.x=p.x;
        t.partner.y=p.y;
        if(arc>.5 && t.height<20){
          const victims=targets.filter(enemy=>enemy.invincible<=0 &&
            Math.abs(p.x-enemy.x)<=t.move.range && Math.abs(p.y-enemy.y)<=t.move.depth);
          if(victims.length){
            this.resolve(p,t.move,victims);
            for(const enemy of victims)t.seen.add(enemy);
          }
        }
        if(t.flight>=2.65 || (arc===1 && !this.enemies.some(enemy=>enemy.hp>0 && !t.seen.has(enemy)))){
          t.phase='land';
          t.time=0;
          t.partner.x=clamp(p.x-t.face*75,bounds.left,bounds.right);
        }
      }else if(t.time>=(t.phase==='land'?.27:.52)){
        this.team=null;
        p.invincible=0;
      }
    }

    resolve(actor, move, targets) {
      if (move.advance) {
        const ahead = targets.filter(target => target.hp > 0 && Math.abs(target.y-actor.y) <= move.depth)
          .map(target => (target.x-actor.x)*actor.face).filter(gap => gap >= 0);
        const step = clamp(Math.min(...ahead)-45,0,move.advance);
        actor.x = clamp(actor.x + actor.face*step,bounds.left,bounds.right);
      }
      if(move.kind==='guard')return;
      if(!move.ultimate)this.emit('strike',actor,move);
      for (const target of targets) {
        if (target.hp <= 0 || target.invincible > 0) continue;
        const dx = target.x-actor.x;
        if (Math.abs(dx) > move.range || (!move.area && dx*actor.face < -28) || Math.abs(target.y-actor.y) > move.depth) continue;
        target.hp = Math.max(0,target.hp - move.damage);
        target.stun = target === this.player ? .32 : (move.freeze || move.shock || (move.lift ? .66 : .23));
        target.invincible = target === this.player ? .63 : .09;
        if (!target.boss || move.lift || move.area || target.attack?.fired) target.attack = null;
        target.flash = .18;
        target.push = (Math.sign(dx) || actor.face)*move.push*7;
        if (move.lift) target.lift = .62;
        if (move.freeze) target.frozen = move.freeze;
        if (move.shock) target.shocked = move.shock;
        if (move.burn) target.burning = move.burn;
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
        actor.shocked=Math.max(0,(actor.shocked||0)-dt);
        actor.burning=Math.max(0,(actor.burning||0)-dt);
        actor.wait -= dt;
        actor.invincible -= dt;
        actor.x += actor.push*dt;
        actor.push *= Math.pow(.002,dt);
        for (const key of Object.keys(actor.cooldown)) actor.cooldown[key] = Math.max(0,actor.cooldown[key]-dt);
      }
      this.advanceTeam(dt);
      if (!this.team && (!p.attack || p.air > 0) && p.stun <= 0 && (horizontal || vertical)) {
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
            const special=enemy.bursts%3===1;
            const selected=special?techniques[enemy.skills[Math.floor(enemy.bursts/3)%enemy.skills.length]]:moves[heavy?'kick':'punch'];
            const move={...selected,wind:Math.max(selected.wind,ranged?.45:.28),damage:Math.round(selected.damage*(.57+this.index*.08))};
            move.duration=Math.max(move.duration,move.wind+(move.repeat||.1)*(move.hits||1)+.15);
            if(move.kind==='guard')enemy.invincible=move.duration;
            if(move.jump)enemy.air=enemy.airDuration=move.duration;
            enemy.bursts++;
            enemy.wait = this.stage.rate + i*.095;
            enemy.attack = {time:0,move,fired:false,hitCount:0};
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
            attack.hitCount=1;
            this.resolve(actor,attack.move,actor === p ? foes : [p]);
          }
          if (attack.move.repeat && attack.fired && attack.hitCount < attack.move.hits && attack.time >= attack.move.wind+attack.move.repeat*attack.hitCount) {
            attack.hitCount++;
            this.resolve(actor,{...attack.move,damage:Math.round(attack.move.damage*.45)},actor===p?foes:[p]);
          }
          if (attack.time >= attack.move.duration) actor.attack = null;
        }
      }
      // Keep nearby fighters from occupying the same spot.
      const living = this.team ? foes.filter(e=>e.hp>0) : [p,...foes.filter(e=>e.hp>0)];
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
      else if (!this.team && !this.enemies.some(e=>e.hp>0)) this.result='victory';
    }
  }

  const api = {Campaign, stages, characters, jobs, techniques, slots, moves, ultimates, timingGauge, distance};
  if (typeof module === 'object') module.exports=api;
  else root.Fighting=api;
})(globalThis);
