import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quotedSearch,safeRedirect} from '../user-app/src/utils/querySafety.js';
import {validateFileContent} from '../user-app/src/utils/fileValidation.js';
test('PostgREST search literals keep filter delimiters inside quoted values',()=>{
 assert.equal(quotedSearch('a,b)"'), '"%a,b)\\"%"');
 assert.equal(safeRedirect('//attacker.test'),'/');assert.equal(safeRedirect('/\\attacker.test'),'/');assert.equal(safeRedirect('/wallet'),'/wallet');
});
test('upload validation rejects declared MIME spoofing and accepts matching signatures',async()=>{
 await assert.rejects(()=>validateFileContent(new File(['<script>alert(1)</script>'],'x.jpg',{type:'image/jpeg'})),/contents/);
 assert.equal(await validateFileContent(new File([new Uint8Array([255,216,255,0])],'x.jpg',{type:'image/jpeg'})),'jpg');
 await assert.rejects(()=>validateFileContent(new File(['%PDF-1.7'],'x.pdf',{type:'application/pdf'})),/allowed/);
 assert.equal(await validateFileContent(new File(['%PDF-1.7'],'x.pdf',{type:'application/pdf'}),{document:true}),'pdf');
});
