import{a as C,b as N,c as B,d as D}from"/build/_shared/chunk-JEQUPTUW.js";import"/build/_shared/chunk-6RSSWUIW.js";import"/build/_shared/chunk-EPETKIDQ.js";import"/build/_shared/chunk-TNRARIGQ.js";import{c as P,e as H,f as R,g as M}from"/build/_shared/chunk-PEDYS3FP.js";import"/build/_shared/chunk-YAIDYOQZ.js";import{a as A,b as c}from"/build/_shared/chunk-WPWRVLZN.js";import{e as o}from"/build/_shared/chunk-2TWE7TSA.js";var E=o(A(),1);var f=o(c(),1),Y=()=>{let e=R(),{theme:t,setTheme:n}=B();return(0,E.useEffect)(()=>{e(P(t))},[]),(0,f.jsx)(C,{className:`
          relative
          hover:cursor-pointer 
          transition-transform
          duration-300
          ease-in-out
          hover:scale-105
          active:scale-95
          xl:w-72
          sm:w-60
          w-52
        `,src:"/images/strelsov-headshot.png",alt:"Spencer Strelsov Headshot",isBlurred:!0,onClick:()=>{e(P(t==="light"?"dark":"light")),n(t==="light"?"dark":"light")}})},j=()=>(0,f.jsx)(D,{fallback:(0,f.jsx)("div",{children:"Loading..."}),children:()=>(0,f.jsx)(Y,{})}),F=j;var l=o(A(),1);var L={blink:"nAaB9"};var p=o(c(),1);function q(e,t){let n=0;for(;n<e.length&&n<t.length&&e[n]===t[n];)n++;return n}function G(e,t){if(t>=e.length)return t;let n=e.slice(t);return/^[\n\s]+$/.test(n)?e.length:t}var J=({phrases:e,period:t=2e3,typingSpeed:n,deletingSpeed:x,loop:v=!0,preserveTrailingNewlines:W=!1})=>{let[g,h]=(0,l.useState)("typing"),[I,w]=(0,l.useState)(0),[a,T]=(0,l.useState)(0),S=M(H);(0,l.useEffect)(()=>{h("typing"),w(0),T(0)},[e]);let b=!v&&I===e.length-1,i=e[I]??"",k=b?"":e[(I+1)%e.length],y=q(i,k);W&&(y=G(i,y)),(0,l.useEffect)(()=>{if(g==="typing")if(a<i.length){let r=i[a],s=n;(r==="."||r===`
`)&&(s*=2);let m=setTimeout(()=>{T(d=>d+1)},s);return()=>clearTimeout(m)}else{let r=setTimeout(()=>{h("pause")},t);return()=>clearTimeout(r)}else if(g==="pause"){if(b)return;h("deleting")}else if(g==="deleting")if(a>y){let r=i[a-1],s=x;(r==="."||r===`
`)&&(s*=2);let m=setTimeout(()=>{T(d=>d-1)},s);return()=>clearTimeout(m)}else w(r=>v?(r+1)%e.length:r+1),h("typing")},[g,a,i,y,t,n,x,I,k,b,v,e.length]);let $=i.slice(0,a);function z(r){return r.split(`
`).map((s,m,d)=>(0,p.jsxs)("span",{children:[s,m<d.length-1&&(0,p.jsx)("br",{})]},m))}return(0,p.jsxs)("div",{children:[z($),(0,p.jsx)("span",{className:`border-r-[2.5px] solid ml-[1.8px] ${L.blink}`,style:S?{borderColor:S}:void 0})]})},O=J;var u=o(c(),1),K=()=>[{title:"New Remix App"},{name:"description",content:"Welcome to Remix!"}],Q=()=>{let e=N("xl");return(0,u.jsxs)("div",{className:"xl:font-light xl:flex-row xl:gap-10 w-full flex flex-col justify-center items-center gap-8 xl:items-start px-6",children:[(0,u.jsx)(F,{}),(0,u.jsx)("div",{className:"flex-1 text-left text-2xl sm:text-3xl leading-relaxed xl:max-w-[30rem] xl:max-h-[25rem] xl:content-start",children:(0,u.jsx)(O,{typingSpeed:e?70:110,period:e?1e3:void 0,deletingSpeed:e?50:70,phrases:e?[`Hey, I'm Spencer!

`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers...and sometimes journalists :)`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design.`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design. I'm passionate about history, storytelling, photography and tech.

`,`Hey, I'm Spencer!

 I'm a PM at Thomson Reuters. I build AI for lawyers.

 I love coding + design. I'm passionate about history, storytelling, photography and tech.

 I'm based in Brooklyn, NY`]:["Hey, I'm Spencer!","I'm a PM at Thomson Reuters","I build AI for lawyers","I build AI for journalists","I love coding + design","I love history","I love storytelling"],loop:!e,preserveTrailingNewlines:!!e})})]})},U=Q;export{U as default,K as meta};
