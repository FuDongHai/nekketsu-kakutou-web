const test = require('node:test');
const assert = require('node:assert/strict');
const {Campaign, characters, jobs, slots, stages, ultimates} = require('../combat.js');

const frame = 1/60;
function advance(game, seconds) {
  for (let i=0; i<Math.ceil(seconds/frame); i++) game.tick(frame);
}

test('each fighter can use exactly the skills on their selection card', () => {
  assert.equal(Object.keys(characters).length,18);
  assert.deepEqual(Object.keys(jobs).map(job=>Object.values(characters).filter(c=>c.job===job).length),[4,4,4,4,2]);
  for (const [hero,card] of Object.entries(characters)) {
    for (const [i,slot] of slots.entries()) {
      const game=new Campaign(0,undefined,'ice',hero);
      assert.equal(game.player.hp,card.hp);
      assert.equal(game.player.palette,hero);
      assert.equal(game.moveFor(slot)?.kind,card.skills[i]);
      assert.equal(game.use(slot),i<card.skills.length);
      if (card.skills[i]==='guard') assert.ok(game.player.invincible>0);
    }
  }
});

test('every campaign opponent starts with their original versus-mode life', () => {
  const expected=[[170],[200,185],[174,195,185],[195,200],[255,250]];
  for (const stage of stages.keys()) {
    const game=new Campaign(stage);
    assert.deepEqual(game.enemies.map(cpu=>cpu.maxHp),expected[stage]);
    assert.deepEqual(game.enemies.map(cpu=>cpu.hp),expected[stage]);
  }
});

for (const kind of Object.keys(ultimates)) {
  test(kind+' launches automatically, hits while traveling, and recovers', () => {
    const events=[];
    const game=new Campaign(0,type=>events.push(type),kind);
    const cpu=game.enemies[0], start=game.player.x;
    cpu.x=start+340;
    const hp=cpu.hp;
    assert.ok(game.use('ultimate'));
    advance(game,.4);
    assert.equal(game.team.phase,'aim');
    assert.equal(cpu.hp,hp);
    advance(game,.45);
    assert.equal(game.team.phase,'flight');
    assert.equal(cpu.hp,hp);
    advance(game,1.45);
    assert.ok(game.player.x>start+40);
    assert.equal(cpu.hp,hp-ultimates[kind].damage);
    assert.equal(events.filter(e=>e==='hit').length,1);
    assert.ok(events.includes('launch'));
    advance(game,.4);
    assert.equal(game.team,null);
    assert.equal(game.use('ultimate'),false);
  });
}

test('manual throws accept gauge cells 6–12, and a mistimed input can be retried', () => {
  for (const cell of [5,6,12,13]) {
    const game=new Campaign(0);
    game.use('ultimate');
    advance(game,.4);
    game.team.meter=cell;
    game.use('punch');
    assert.equal(game.team.phase,[6,12].includes(cell)?'flight':'miss');
    if (cell===5) {
      advance(game,2.1);
      assert.ok(game.use('ultimate'));
    }
  }
});

test('the powered arc tracks a second lane and waits for landing after the final KO', () => {
  const game=new Campaign(1);
  const [first,second]=game.enemies;
  first.hp=1;
  second.hp=1;
  first.stun=second.stun=10;
  first.x=game.player.x+220;
  second.x=first.x+220;
  second.y=570;
  game.use('ultimate');
  let peak=0;
  for(let i=0; i<250 && second.hp>0; i++){
    game.tick(frame);
    peak=Math.max(peak,game.team?.height||0);
  }
  assert.ok(peak>=75);
  assert.equal(first.hp,0);
  assert.equal(second.hp,0);
  assert.equal(game.team.phase,'land');
  assert.equal(game.result,'');
  advance(game,.3);
  assert.equal(game.result,'victory');
});
