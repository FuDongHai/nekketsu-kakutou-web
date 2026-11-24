(function (root) {
  'use strict';

  const width=240, height=176, cell=40;
  const {characters,timingGauge}=root.Fighting;
  const elements=['ice','volt','wind','fire'];
  const floor=[111,116,141,116,128];

  function load(name){
    const picture=new Image();
    picture.src='assets/fc-'+name+'.png';
    return picture;
  }
  function ready(image){return image.complete&&image.naturalWidth>0;}
  function position(actor,index){
    return [Math.round(actor.x*width/1280),Math.round(floor[index]+(actor.y-421)/(600-421)*(169-floor[index]))];
  }
  function oval(ctx,x,y,a,b,color){
    ctx.beginPath();
    ctx.ellipse(x,y,a,b,0,0,2*Math.PI);
    ctx.fillStyle=color;
    ctx.fill();
  }
  function pose(actor,time){
    if(actor.hp<=0) return 11;
    const attack=actor.attack;
    if(attack){
      const {kind,wind}=attack.move;
      if(kind==='guard')return 11;
      if(kind==='tornado'||kind==='spin')return Math.floor(attack.time*17)%2?7:8;
      if(kind==='stomp')return attack.time<wind?7:Math.floor(attack.time*19)%2?8:10;
      if(kind==='guillotine'||kind==='highKick')return attack.time<wind?7:10;
      if(kind==='elbow')return attack.time<wind?7:9;
      if(kind==='rapidPunch')return Math.floor(attack.time*30)%2?3:4;
      if(kind==='mach')return Math.floor(attack.time*30)%2?5:6;
      if(kind==='kick'||kind==='burst')return attack.time<wind?5:6;
      return attack.time<wind?3:4;
    }
    if(actor.air>0||actor.lift>0) return 7;
    if(actor.moving) return Math.floor(actor.step*1.33)%2?1:2;
    return Math.floor(time*2.9)%2?0:11;
  }

  class Arena {
    constructor(canvas){
      this.c=canvas.getContext('2d',{alpha:false});
      this.c.imageSmoothingEnabled=false;
      this.title=load('title');
      this.sets=Array.from({length:5},(_,i)=>load('stage-'+(i+1)));
      this.fighters=load('fighters');
      this.combos=load('combos');
      this.effects=[];
      this.index=0;
      this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    reset(){this.effects=[];}
    react(type,actor,move){
      if(type!=='hit')return;
      this.effects.push({actor,move,age:0,duration:move.ultimate ? .48 : .21});
    }
    update(dt){
      this.effects=this.effects.filter(effect=>(effect.age+=dt)<effect.duration);
    }
    fighter(actor,time,index,rise=0,frame=pose(actor,time),tilt=0){
      if(!ready(this.fighters))return;
      const ctx=this.c,[x,y]=position(actor,index);
      const jump=actor.air>0?Math.sin(actor.air/(actor.airDuration||.59)*Math.PI)*19:0;
      const lift=actor.lift>0?Math.sin(actor.lift/.62*Math.PI)*15:0;
      const up=Math.round(rise+jump+lift);
      oval(ctx,x,y,7,2,'#111113a8');
      ctx.save();
      ctx.translate(x,y-up);
      if(actor.hp<=0){ctx.translate(-6,-3);ctx.rotate(-Math.PI/2);}
      else {ctx.scale(actor.face,1);if(tilt)ctx.rotate(tilt);}
      if(actor.flash>0&&!this.reduce&&Math.floor(actor.flash*50)%2===1)ctx.globalAlpha=.42;
      ctx.drawImage(this.fighters,frame*cell,characters[actor.palette].row*cell,cell,cell,-16,-36,cell,cell);
      ctx.restore();
      if(actor.frozen){
        ctx.strokeStyle='#87eaff';ctx.strokeRect(x-9,y-up-27,18,26);
        ctx.fillStyle='#ebfcff';ctx.fillRect(x-7,y-up-24,2,5);
      }
    }
    element(kind,time,rolling,x,y,face){
      if(!ready(this.combos))return;
      const row=elements.indexOf(kind)+(rolling?4:0);
      const frame=Math.floor(time*60)%(rolling?16:24);
      const ctx=this.c;
      ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
      ctx.drawImage(this.combos,frame*cell,row*cell,cell,cell,-20,-20,cell,cell);
      ctx.restore();
    }
    gauge(x,y,meter){
      const ctx=this.c;
      const left=Math.max(1,Math.min(width-41,x-19));
      ctx.fillStyle='#151019';ctx.fillRect(left-1,y-2,40,7);
      ctx.fillStyle='#eee9db';ctx.fillRect(left,y,38,3);
      ctx.fillStyle='#4968aa';ctx.fillRect(left+timingGauge.first*2,y,(timingGauge.last-timingGauge.first+1)*2,3);
      ctx.fillStyle='#ffac26';ctx.fillRect(left+meter*2,y-1,2,5);
    }
    teamPlayer(player,team,time,index){
      const [x,y]=position(player,index);
      const progress=team.time;
      if(team.phase==='mount'||team.phase==='aim'){
        const rise=team.phase==='aim'?22:22*Math.min(1,progress/.38)+10*Math.sin(Math.min(1,progress/.38)*Math.PI);
        this.fighter(player,time,index,rise,team.phase==='mount'?7:0);
        if(team.phase==='aim')this.gauge(x,y-58,team.meter);
      }else if(team.phase==='flight'){
        oval(this.c,x,y,7,2,'#111113a8');
        this.element(team.move.kind,team.flight,team.flight<.14,x,y-16-team.height,team.face);
      }else if(team.phase==='miss'){
        this.fighter(player,time,index,Math.max(0,22*(1-progress/.36)),8,Math.sin(Math.min(1,progress/.36)*Math.PI)*1.4);
      }else{
        this.fighter(player,time,index,Math.max(0,16*(1-progress/.27)),progress<.18?8:11);
      }
    }
    effect(event){
      const ctx=this.c,phase=event.age/event.duration;
      const [x,ground]=position(event.actor,this.index),y=ground-15;
      if(event.move.ultimate){
        const lift=event.actor.lift>0?Math.sin(event.actor.lift/.62*Math.PI)*15:0;
        this.element(event.move.kind,event.age,false,x,y-lift,event.actor.face);
      }else{
        ctx.globalAlpha=1-phase;ctx.fillStyle=event.move.color;
        ctx.fillRect(x-6,y,13,2);ctx.fillRect(x,y-6,2,13);
        ctx.fillStyle='#fff';ctx.fillRect(x-1,y-1,4,4);ctx.globalAlpha=1;
      }
    }
    draw(game,time,opening=false){
      const ctx=this.c;
      ctx.fillStyle='#08070c';
      ctx.fillRect(0,0,width,height);
      if(opening){
        if(ready(this.title))ctx.drawImage(this.title,0,0,width,height,0,0,width,height);
        return;
      }
      this.index=game.index;
      const stage=this.sets[game.index];
      if(ready(stage))ctx.drawImage(stage,0,0);
      const team=game.team;
      const roster=[...game.enemies];
      if(team && team.phase!=='flight')roster.push(team.partner);
      roster.push(game.player);
      roster.sort((a,b)=>a.y-b.y);
      for(const actor of roster){
        if(team && actor===game.player)this.teamPlayer(actor,team,time,game.index);
        else if(team && actor===team.partner){
          const frame=team.phase==='mount'?1:team.phase==='flight'&&team.flight<.2?4:11;
          this.fighter(actor,time,game.index,0,frame);
        }else this.fighter(actor,time,game.index);
      }
      for(const effect of this.effects)this.effect(effect);
    }
  }

  root.Arena=Arena;
})(globalThis);
