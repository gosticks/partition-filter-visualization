import{w as c,s as d}from"./scheduler.nEzbEOuw.js";const r=[];function h(s,u){return{subscribe:l(s,u).subscribe}}function l(s,u=c){let t;const i=new Set;function b(n){if(d(s,n)&&(s=n,t)){const o=!r.length;for(const e of i)e[1](),r.push(e,s);if(o){for(let e=0;e<r.length;e+=2)r[e][0](r[e+1]);r.length=0}}}function f(n){b(n(s))}function a(n,o=c){const e=[n,o];return i.add(e),i.size===1&&(t=u(b,f)||c),n(s),()=>{i.delete(e),i.size===0&&t&&(t(),t=null)}}return{set:b,update:f,subscribe:a}}function g(s){return{subscribe:s.subscribe.bind(s)}}export{g as a,h as r,l as w};