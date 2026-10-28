import {webkit} from 'playwright';
const b=await webkit.launch({headless:true}),p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:4173/viva-test/');await p.locator('.home').waitFor();await p.waitForTimeout(500);
await p.evaluate(()=>localStorage.setItem('viva-progress-v1',JSON.stringify({version:1,order:[1,2,3,4,5,6,7,8,9,10],completed:[1],sound:false,motion:true,revealed:[]})));
await p.reload();await p.locator('.library-room').waitFor();
for(const [width,height] of [[375,667],[390,844],[430,932]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(500);
 console.log(await p.evaluate(()=>({inner:[innerWidth,innerHeight],html:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],body:[document.body.scrollWidth,document.body.scrollHeight],app:[document.querySelector('.app').clientWidth,document.querySelector('.app').clientHeight],vh:getComputedStyle(document.documentElement).getPropertyValue('--vh'),button:getComputedStyle(document.querySelector('.primary')).font,fontCheck:document.fonts.check('800 16px Nunito'),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status,weight:f.weight}))})));
}
await b.close();
