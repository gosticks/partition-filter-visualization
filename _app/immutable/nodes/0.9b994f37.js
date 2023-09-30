import{S as U,i as Q,s as W,k as v,q as O,a as B,y as N,l as S,m as w,r as j,h as g,c as M,z,n as E,C as d,b as I,D as b,A as T,u as R,g as h,v as Y,d as $,f as Z,E as re,F as A,B as C,G as ae,H as ne,I as oe,J as se,K as ie,L as le,M as fe,N as ce,o as ue}from"../chunks/index.14b8a44d.js";import{X as pe,T as L,s as F}from"../chunks/XIcon.39faf244.js";import{B as x,a as de,b as ee,N as f,f as H,c as V,n as te}from"../chunks/fadeSlide.f65added.js";const me=!0,Ee=Object.freeze(Object.defineProperty({__proto__:null,prerender:me},Symbol.toStringTag,{value:"Module"}));function _e(r){let e,a;return e=new pe({props:{size:"16"}}),{c(){N(e.$$.fragment)},l(t){z(e.$$.fragment,t)},m(t,o){T(e,t,o),a=!0},p:ae,i(t){a||(h(e.$$.fragment,t),a=!0)},o(t){$(e.$$.fragment,t),a=!1},d(t){C(e,t)}}}function K(r){let e,a=r[0].description+"",t;return{c(){e=v("p"),t=O(a),this.h()},l(o){e=S(o,"P",{class:!0});var u=w(e);t=j(u,a),u.forEach(g),this.h()},h(){E(e,"class","line-clamp-2")},m(o,u){I(o,e,u),b(e,t)},p(o,u){u&1&&a!==(a=o[0].description+"")&&R(t,a)},d(o){o&&g(e)}}}function P(r){let e,a,t;return a=new x({props:{size:ee.SM,color:r[1],$$slots:{default:[ge]},$$scope:{ctx:r}}}),a.$on("click",function(){ne(r[0].callback)&&r[0].callback.apply(this,arguments)}),{c(){e=v("div"),N(a.$$.fragment),this.h()},l(o){e=S(o,"DIV",{class:!0});var u=w(e);z(a.$$.fragment,u),u.forEach(g),this.h()},h(){E(e,"class","text-right")},m(o,u){I(o,e,u),T(a,e,null),t=!0},p(o,u){r=o;const m={};u&2&&(m.color=r[1]),u&17&&(m.$$scope={dirty:u,ctx:r}),a.$set(m)},i(o){t||(h(a.$$.fragment,o),t=!0)},o(o){$(a.$$.fragment,o),t=!1},d(o){o&&g(e),C(a)}}}function ge(r){let e=(r[0].callbackLabel??"more")+"",a;return{c(){a=O(e)},l(t){a=j(t,e)},m(t,o){I(t,a,o)},p(t,o){o&1&&e!==(e=(t[0].callbackLabel??"more")+"")&&R(a,e)},d(t){t&&g(a)}}}function he(r){let e,a,t,o=r[0].message+"",u,m,l,D,k,_,n;l=new x({props:{variant:de.LINK,size:ee.SM,color:r[1],$$slots:{default:[_e]},$$scope:{ctx:r}}}),l.$on("click",r[2]);let p=r[0].description&&K(r),s=r[0].callback&&P(r);return{c(){e=v("div"),a=v("div"),t=v("h3"),u=O(o),m=B(),N(l.$$.fragment),D=B(),p&&p.c(),k=B(),s&&s.c(),this.h()},l(i){e=S(i,"DIV",{class:!0});var c=w(e);a=S(c,"DIV",{class:!0});var y=w(a);t=S(y,"H3",{class:!0});var q=w(t);u=j(q,o),q.forEach(g),m=M(y),z(l.$$.fragment,y),y.forEach(g),D=M(c),p&&p.l(c),k=M(c),s&&s.l(c),c.forEach(g),this.h()},h(){E(t,"class","font-bold line-clamp-1 break-all"),E(a,"class","flex gap-1 justify-between"),E(e,"class","px-3 py-2 shadow-xl w-72 rounded-xl max-w-full break-words border"),d(e,"bg-red-500",r[0].type===f.error),d(e,"border-red-600",r[0].type===f.error),d(e,"text-red-200",r[0].type===f.error),d(e,"dark:bg-red-800",r[0].type===f.error),d(e,"dark:border-red-600",r[0].type===f.error),d(e,"dark:text-red-400",r[0].type===f.error),d(e,"bg-primary-200",r[0].type===f.info),d(e,"border-primary-400",r[0].type===f.info),d(e,"text-primary-800",r[0].type===f.info),d(e,"dark:bg-primary-800",r[0].type===f.info),d(e,"dark:border-primary-600",r[0].type===f.info),d(e,"dark:text-primary-400",r[0].type===f.info),d(e,"bg-green-500",r[0].type===f.success),d(e,"border-green-600",r[0].type===f.success),d(e,"text-green-100",r[0].type===f.success),d(e,"dark:bg-green-800",r[0].type===f.success),d(e,"dark:border-green-600",r[0].type===f.success),d(e,"dark:text-green-400",r[0].type===f.success)},m(i,c){I(i,e,c),b(e,a),b(a,t),b(t,u),b(a,m),T(l,a,null),b(e,D),p&&p.m(e,null),b(e,k),s&&s.m(e,null),n=!0},p(i,[c]){(!n||c&1)&&o!==(o=i[0].message+"")&&R(u,o);const y={};c&2&&(y.color=i[1]),c&16&&(y.$$scope={dirty:c,ctx:i}),l.$set(y),i[0].description?p?p.p(i,c):(p=K(i),p.c(),p.m(e,k)):p&&(p.d(1),p=null),i[0].callback?s?(s.p(i,c),c&1&&h(s,1)):(s=P(i),s.c(),h(s,1),s.m(e,null)):s&&(Y(),$(s,1,1,()=>{s=null}),Z()),(!n||c&1)&&d(e,"bg-red-500",i[0].type===f.error),(!n||c&1)&&d(e,"border-red-600",i[0].type===f.error),(!n||c&1)&&d(e,"text-red-200",i[0].type===f.error),(!n||c&1)&&d(e,"dark:bg-red-800",i[0].type===f.error),(!n||c&1)&&d(e,"dark:border-red-600",i[0].type===f.error),(!n||c&1)&&d(e,"dark:text-red-400",i[0].type===f.error),(!n||c&1)&&d(e,"bg-primary-200",i[0].type===f.info),(!n||c&1)&&d(e,"border-primary-400",i[0].type===f.info),(!n||c&1)&&d(e,"text-primary-800",i[0].type===f.info),(!n||c&1)&&d(e,"dark:bg-primary-800",i[0].type===f.info),(!n||c&1)&&d(e,"dark:border-primary-600",i[0].type===f.info),(!n||c&1)&&d(e,"dark:text-primary-400",i[0].type===f.info),(!n||c&1)&&d(e,"bg-green-500",i[0].type===f.success),(!n||c&1)&&d(e,"border-green-600",i[0].type===f.success),(!n||c&1)&&d(e,"text-green-100",i[0].type===f.success),(!n||c&1)&&d(e,"dark:bg-green-800",i[0].type===f.success),(!n||c&1)&&d(e,"dark:border-green-600",i[0].type===f.success),(!n||c&1)&&d(e,"dark:text-green-400",i[0].type===f.success)},i(i){n||(h(l.$$.fragment,i),h(s),re(()=>{n&&(_||(_=A(e,H,{duration:70},!0)),_.run(1))}),n=!0)},o(i){$(l.$$.fragment,i),$(s),_||(_=A(e,H,{duration:70},!1)),_.run(0),n=!1},d(i){i&&g(e),C(l),p&&p.d(),s&&s.d(),i&&_&&_.end()}}}function be(r,e,a){let{notification:t}=e;const o=l=>{switch(l.type){case f.error:return V.ERROR;case f.info:return V.INFO;case f.success:return V.SUCCESS}};let u=o(t);const m=()=>te.removeNotification(t.id);return r.$$set=l=>{"notification"in l&&a(0,t=l.notification)},r.$$.update=()=>{r.$$.dirty&1&&a(1,u=o(t))},[t,u,m]}class $e extends U{constructor(e){super(),Q(this,e,be,he,W,{notification:0})}}function X(r,e,a){const t=r.slice();return t[3]=e[a],t}function G(r){let e,a;return e=new $e({props:{notification:r[3]}}),{c(){N(e.$$.fragment)},l(t){z(e.$$.fragment,t)},m(t,o){T(e,t,o),a=!0},p(t,o){const u={};o&1&&(u.notification=t[3]),e.$set(u)},i(t){a||(h(e.$$.fragment,t),a=!0)},o(t){$(e.$$.fragment,t),a=!1},d(t){C(e,t)}}}function ke(r){let e,a,t,o,u,m=r[0],l=[];for(let n=0;n<m.length;n+=1)l[n]=G(X(r,m,n));const D=n=>$(l[n],1,1,()=>{l[n]=null}),k=r[2].default,_=oe(k,r,r[1],null);return{c(){e=v("div"),a=v("div");for(let n=0;n<l.length;n+=1)l[n].c();t=B(),o=v("main"),_&&_.c(),this.h()},l(n){e=S(n,"DIV",{class:!0});var p=w(e);a=S(p,"DIV",{class:!0});var s=w(a);for(let c=0;c<l.length;c+=1)l[c].l(s);s.forEach(g),t=M(p),o=S(p,"MAIN",{});var i=w(o);_&&_.l(i),i.forEach(g),p.forEach(g),this.h()},h(){E(a,"class","absolute top-5 flex flex-col gap-2 max-h-96 left-5 z-50"),E(e,"class","min-h-screen relative isolate max-h-screen max-w-full bg-slate-100 dark:bg-background-950 dark:text-slate-200")},m(n,p){I(n,e,p),b(e,a);for(let s=0;s<l.length;s+=1)l[s]&&l[s].m(a,null);b(e,t),b(e,o),_&&_.m(o,null),u=!0},p(n,[p]){if(p&1){m=n[0];let s;for(s=0;s<m.length;s+=1){const i=X(n,m,s);l[s]?(l[s].p(i,p),h(l[s],1)):(l[s]=G(i),l[s].c(),h(l[s],1),l[s].m(a,null))}for(Y(),s=m.length;s<l.length;s+=1)D(s);Z()}_&&_.p&&(!u||p&2)&&se(_,k,n,n[1],u?le(k,n[1],p,null):ie(n[1]),null)},i(n){if(!u){for(let p=0;p<m.length;p+=1)h(l[p]);h(_,n),u=!0}},o(n){l=l.filter(Boolean);for(let p=0;p<l.length;p+=1)$(l[p]);$(_,n),u=!1},d(n){n&&g(e),fe(l,n),_&&_.d(n)}}}function J(r){r?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark")}function ye(r,e,a){let t;ce(r,te,m=>a(0,t=m));let{$$slots:o={},$$scope:u}=e;return ue(()=>{window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change",m=>{const l=m.matches?L.Dark:L.Light;J(l===L.Dark),F.updateTheme(l)}),F.subscribe(m=>{J(m.theme===L.Dark)})}),r.$$set=m=>{"$$scope"in m&&a(1,u=m.$$scope)},[t,u,o]}class De extends U{constructor(e){super(),Q(this,e,ye,ke,W,{})}}export{De as component,Ee as universal};