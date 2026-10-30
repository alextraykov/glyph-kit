// The spoken-screens reader, copied with its tests from traykov-ascii (45e4c55). Its CLI command and
// session replay stay there for now.
import test from 'node:test';
import assert from 'node:assert/strict';
import {read,apply,screenSpec} from '../skills/glyph-kit/scripts/say.mjs';
const blank=()=>({kind:'screen',data:{title:'',rows:[]}});
const say=(text,s=blank())=>apply(s,read(text,s));
test('opening example creates the actual input and choice',()=>{const s=say('A popover called Choose environment. A name field. Then two radio options, staging and production.');assert.equal(s.data.title,'Choose environment');assert.deepEqual(s.data.rows.map(r=>r.type),['input','radio']);assert.equal(s.data.rows[1].selected,'Staging');});
test('row type words inside a text label stay text',()=>{for(const text of ['Click the save button','Rename this screen to Monday','Note that this is optional','A dialog called Help over the screen']){const s=say(`A paragraph saying "${text}"`);assert.equal(s.data.rows[0]?.type,'text');assert.equal(s.data.rows[0].text,text);assert.equal(s.data.title,'');}});
test('adding two switches keeps both',()=>{const s=say('A switch for Weekly summary, off. A switch for Notifications, on.');assert.equal(s.data.rows.length,2);assert.equal(s.data.rows[0].on,false);assert.equal(s.data.rows[1].on,true);});
test('remove named input keeps other input',()=>{const s=say('A name field. An email field. Remove the name field.');assert.equal(s.data.rows.length,1);assert.equal(s.data.rows[0].label,'Email');});
test('missing remove target cannot delete a control',()=>{const a=say('A name field. An email field.');const s=say('Remove the banana',a);assert.deepEqual(s.data.rows.slice(0,2),a.data.rows);assert.equal(s.data.rows.at(-1).unread,true);});
test('quoted conjunction in choices preserves one option',()=>{const s=say('Radio options: "Research and development", "Sales"');assert.deepEqual(s.data.rows[0].options,['Research and development','Sales']);});
test('selected tab equals authored option',()=>{const s=say('Tabs for profile, notifications and billing, notifications selected');const row=s.data.rows[0];assert.ok(row.items.includes(row.selected));assert.equal(row.selected.toLowerCase(),'notifications');});
test('draft operations never mutate committed input',()=>{const a=say('A name field.');const before=JSON.stringify(a);for(const phrase of ['An email','An email field','Actually a dropdown','Remove the name field'])say(phrase,a);assert.equal(JSON.stringify(a),before);});
test('undo restores preceding transaction',()=>{const a=say('A name field.');const b=say('An email field. A gap.',a);const restored=say('Undo.',b);assert.deepEqual(screenSpec(restored),screenSpec(a));});
test('correction keeps stable row identity',()=>{const a=say('A name field.');const b=say('Actually, a dropdown',a);assert.equal(b.data.rows.length,1);assert.equal(b.data.rows[0].id,a.data.rows[0].id);assert.equal(b.data.rows[0].type,'select');});
test('heading is not mistaken for outer title',()=>{const s=say('A heading called API Settings.');assert.equal(s.data.rows[0].type,'heading');assert.equal(s.data.title,'');});
test('input phrase does not become outer container',()=>{const s=say('A text box for the name');assert.equal(s.data.rows[0].type,'input');assert.equal(s.data.title,'');});
test('input is length bounded',()=>assert.throws(()=>say('a'.repeat(601))));
test('named field edits on ordinary spec target correct row',()=>{const s=say('Remove the email field',{kind:'screen',data:{title:'Settings',rows:[{type:'input',label:'Name'},{type:'input',label:'Email'}]}});assert.equal(s.data.rows[0].label,'Name');assert.equal(s.data.rows.length,1);});

import { readFileSync } from 'node:fs';
import { body } from '../skills/glyph-kit/scripts/render/text.mjs';
import { PRIMITIVES, ROW_NAMES } from '../skills/glyph-kit/scripts/areas/wireframes.mjs';
const subset=(actual,expected)=>Array.isArray(expected)
  ? Array.isArray(actual)&&actual.length===expected.length&&expected.every((v,i)=>subset(actual[i],v))
  : expected&&typeof expected==='object'
    ? actual&&Object.entries(expected).every(([k,v])=>subset(actual[k],v))
    : actual===expected;
for(const name of ['rows','screens','edits','unclear']) {
 const cases=JSON.parse(readFileSync(new URL(`./fixtures/say/${name}.json`,import.meta.url))).cases;
 for(const [index,c] of cases.entries()) test(`${name} ${index+1}: ${c.sentence??'undo transaction'}`,()=>{
  let s=c.initial??{kind:'screen',data:{title:name==='rows'?'Example':'',rows:[]}};
  const original=JSON.stringify(s);
  let actual=s;
  for(const step of c.steps??[{sentence:c.sentence}]) actual=say(step.sentence,actual);
  assert.equal(JSON.stringify(s),original,'input must not be mutated');
  assert.equal(typeof body(screenSpec(actual)),'string','canonical render must succeed');
  let expected=c.expected;
  if(name==='rows'){assert.equal(actual.data.rows.length,1);expected=c.expectedRow;actual=actual.data.rows[0];}
  if(name==='screens')actual={kind:actual.kind,...actual.data};
  if(name==='unclear')actual={...actual.data,unread:[...actual.data.rows,...actual.data.overlay?.rows??[]].some(r=>r.unread)};
  assert.ok(subset(actual,expected),JSON.stringify({actual,expected},null,2));
 });
}
test('vocabulary covers exactly the existing primitives',()=>assert.deepEqual(Object.keys(ROW_NAMES).sort(),Object.keys(PRIMITIVES).sort()));
test('same input yields the same output and stable ids',()=>{
 const text='A name field. A Save button.';
 assert.deepEqual(say(text),say(text));
 const s=say('A name field. A name field.');
 assert.equal(new Set(s.data.rows.map(r=>r.id)).size,2);
});
test('comma-separated screen clauses preserve rows and title',()=>{
 const s=say('A popover called Choose environment, a name field, then two radio options, staging and production.');
 assert.equal(s.data.title,'Choose environment');
 assert.deepEqual(s.data.rows.map(row=>row.type),['input','radio']);
 assert.deepEqual(s.data.rows[1].options,['Staging','Production']);
});
test('named rename changes only the named input',()=>{
 const before=say('A name field. An email field.');
 const s=say('Rename the name field to Full name',before);
 assert.equal(s.data.rows[0].label,'Full name');
 assert.deepEqual(s.data.rows[1],before.data.rows[1]);
 assert.equal(s.data.rows[0].id,before.data.rows[0].id);
});
test('invalid named and ordinal selections preserve the choice as unread text',()=>{
 for(const initial of ['Two radio options, staging and production','Tabs for staging and production','A dropdown for Environment, options staging and production']) {
  const before=say(initial);
  for(const phrase of ['Make banana selected','Make the third option selected']) {
   const s=say(phrase,before);
   assert.deepEqual(s.data.rows[0],before.data.rows[0]);
   assert.equal(s.data.rows.at(-1).unread,true);
  }
 }
});
test('plain list colon syntax creates items',()=>{
 const s=say('A list: Alpha, Beta');
 assert.equal(s.data.rows[0].type,'list');
 assert.deepEqual(s.data.rows[0].items,['Alpha','Beta']);
});
