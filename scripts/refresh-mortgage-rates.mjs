import { readFile,writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validSnapshot } from '../lib/refinance.ts';
export function parseRates(html,now=new Date()){
 const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ');
 const date=text.match(/weekly mortgage rate averages as of\s*(\d{2})\/(\d{2})\/(\d{4})/i);
 if(!date)throw Error('Public source date schema changed; retaining last snapshot.');
 const rates=[30,15].map(years=>{const match=text.match(new RegExp(`${years}[-– ]year Fixed[-– ]Rate Mortgage\\s*(\\d+(?:\\.\\d+)?)%`,'i'));if(!match)throw Error('Public rate schema changed; retaining last snapshot.');return {years,rate:Number(match[1])};});
 const snapshot={observed:`${date[3]}-${date[1]}-${date[2]}`,source:'https://www.freddiemac.com/pmms',rates};
 if(!validSnapshot(snapshot,now))throw Error('Public snapshot failed date/range validation.');return snapshot;
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const source='https://www.freddiemac.com/pmms',response=await fetch(source,{signal:AbortSignal.timeout(30000)});
 if(!response.ok||new URL(response.url).hostname!=='www.freddiemac.com')throw Error('Public source unavailable.');
 const snapshot=parseRates(await response.text()),file=new URL('../public/mortgage-rates.json',import.meta.url),previous=JSON.parse(await readFile(file,'utf8'));
 if(snapshot.observed<previous.observed)throw Error('Public source moved backwards; retaining last snapshot.');
 if(snapshot.observed>previous.observed)await writeFile(file,JSON.stringify(snapshot,null,2)+'\n');
}
