import test from 'node:test';
import assert from 'node:assert/strict';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { createBlobBucket } from '../server/vercel-storage.mjs';

test('private blob reads bypass the cache and retain the ETag',async()=>{
  const bucket=createBlobBucket({get:async(key,options)=>{assert.equal(options.access,'private');assert.equal(options.useCache,false);assert.equal(options.headers['Accept-Encoding'],'identity');return {statusCode:200,blob:{etag:'v1'},stream:new Response('{"ok":true}').body};}});
  const record=await bucket.get('state');assert.equal(record.etag,'v1');assert.deepEqual(await record.json(),{ok:true});
});
test('reads reject weak or absent ETags instead of allowing unsafe updates',async()=>{
  for(const etag of ['W/"v1"','']) {
    const bucket=createBlobBucket({get:async()=>({statusCode:200,blob:{etag},stream:new Response('{}').body})});
    await assert.rejects(bucket.get('state'),/unsafe version identifier/);
  }
});
test('blob updates use conditional writes and creation does not overwrite',async()=>{
  const options=[];const bucket=createBlobBucket({put:async(k,v,o)=>{options.push(o);return {etag:'v2'};}});
  await bucket.put('state','{}',{onlyIf:{etagDoesNotMatch:'*'}});
  await bucket.put('state','{}',{onlyIf:{etagMatches:'v1'}});
  assert.equal(options[0].allowOverwrite,false);assert.equal(options[0].addRandomSuffix,false);
  assert.equal(options[1].ifMatch,'v1');assert.equal(options[1].access,'private');
});
test('conditional conflict triggers a retry without hiding other failures',async()=>{
  const bucket=createBlobBucket({put:async()=>{throw new BlobPreconditionFailedError();}});
  assert.equal(await bucket.put('state','{}',{onlyIf:{etagMatches:'stale'}}),null);
  const unavailable=createBlobBucket({put:async()=>{throw new Error('offline');}});
  await assert.rejects(unavailable.put('state','{}',{onlyIf:{etagMatches:'v1'}}),/offline/);
});
