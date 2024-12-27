"use strict";(self.webpackChunkhomebase=self.webpackChunkhomebase||[]).push([[156],{9156:(e,t,n)=>{n.r(t),n.d(t,{default:()=>T});var r=n(4292),o=n(5096),s=n(9904),i=n(5043),a=n(1893),l=n(3075),c=n(2186),u=n(2851);const m=n(3003).d4;function d(e){return e.flatMap((e=>function(e){const t=[];for(let n=0;n<e.length-1;n++)t.push({start:e[n],end:e[n+1]});return t}(e.legs)))}function f(e){if(0===e.length)return[];const t=[];t.push(e[0].start);for(let n=0;n<e.length;n++)t.push(e[n].end);return t}const h=[{id:"nyc-dallas",title:"NYC \u2192 Dallas",description:"A short trip to Dallas to escape the winter cold.",startDate:"2021-01-05",endDate:"2021-01-10",images:["https://example.com/dallas1.jpg","https://example.com/dallas2.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:32.7767,lon:-96.797,name:"Dallas",iso:"USA"}]},{id:"nyc-sf",title:"NYC \u2192 San Francisco",description:"Coast-to-coast weekend getaway.",startDate:"2021-02-10",endDate:"2021-02-15",images:["https://example.com/sf1.jpg","https://example.com/sf2.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:37.7749,lon:-122.4194,name:"San Francisco",iso:"USA"}]},{id:"nyc-louisville-1",title:"NYC \u2192 Louisville",description:"A quick trip for bourbon and horse racing.",startDate:"2021-03-05",endDate:"2021-03-10",images:["https://example.com/louisville1.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:38.2527,lon:-85.7585,name:"Louisville",iso:"USA"}]},{id:"nyc-seattle",title:"NYC \u2192 Seattle",description:"Coffee and rain in the Pacific Northwest.",startDate:"2021-04-01",endDate:"2021-04-07",images:[],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:47.6062,lon:-122.3321,name:"Seattle",iso:"USA"}]},{id:"nyc-bogota-cumaral-cartagena",title:"NYC \u2192 Bogota \u2192 Cumaral \u2192 Cartagena",description:"Exploring Colombia, from the capital to the countryside to the coast.",startDate:"2021-05-10",endDate:"2021-05-25",images:["https://example.com/bogota.jpg","https://example.com/cartagena.jpg"],countries:["COL"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:4.711,lon:-74.0721,name:"Bogota",iso:"COL"},{lat:4.2702,lon:-73.4772,name:"Cumaral",iso:"COL"},{lat:10.391,lon:-75.4794,name:"Cartagena",iso:"COL"}]},{id:"nyc-destin",title:"NYC \u2192 Destin",description:"Relaxing on the Emerald Coast.",startDate:"2021-06-01",endDate:"2021-06-05",images:["https://example.com/destin.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:30.3935,lon:-86.4958,name:"Destin",iso:"USA"}]},{id:"nyc-sanjose",title:"NYC \u2192 San Jose, CA",description:"Visiting Silicon Valley.",startDate:"2021-07-01",endDate:"2021-07-07",images:[],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:37.3382,lon:-121.8863,name:"San Jose, CA",iso:"USA"}]},{id:"nyc-nashville-louisville",title:"NYC \u2192 Nashville \u2192 Louisville",description:"From Music City to Derby City.",startDate:"2021-08-10",endDate:"2021-08-20",images:["https://example.com/nashville.jpg","https://example.com/louisville2.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:36.1627,lon:-86.7816,name:"Nashville",iso:"USA"},{lat:38.2527,lon:-85.7585,name:"Louisville",iso:"USA"}]},{id:"nyc-london-zurich-copenhagen-bern",title:"NYC \u2192 London \u2192 Zurich \u2192 Copenhagen \u2192 Bern",description:"European adventure through the UK, Switzerland, and Denmark.",startDate:"2021-09-05",endDate:"2021-09-25",images:["https://example.com/london.jpg","https://example.com/zurich.jpg"],countries:["GBR","CHE","DNK"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:51.5074,lon:-.1278,name:"London",iso:"GBR"},{lat:47.3769,lon:8.5417,name:"Zurich",iso:"CHE"},{lat:55.6761,lon:12.5683,name:"Copenhagen",iso:"DNK"},{lat:46.948,lon:7.4474,name:"Bern",iso:"CHE"}]},{id:"nyc-reykjavik",title:"NYC \u2192 Reykjavik",description:"Checking out Iceland's capital city.",startDate:"2021-10-01",endDate:"2021-10-05",images:["https://example.com/reykjavik.jpg"],countries:["ISL"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:64.1466,lon:-21.9426,name:"Reykjavik",iso:"ISL"}]},{id:"nyc-louisville-2",title:"NYC \u2192 Louisville",description:"A second trip back for more Kentucky experiences.",startDate:"2021-11-01",endDate:"2021-11-05",images:[],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:38.2527,lon:-85.7585,name:"Louisville",iso:"USA"}]},{id:"nyc-louisville-3",title:"NYC \u2192 Louisville (Part 3)",description:"Yet another Louisville trip.",startDate:"2021-12-05",endDate:"2021-12-10",images:["https://example.com/louisville3.jpg"],countries:["USA"],legs:[{lat:40.7128,lon:-74.006,name:"New York City",iso:"USA"},{lat:38.2527,lon:-85.7585,name:"Louisville",iso:"USA"}]}];var p=n(9435);const g=(e,t,n)=>{const r=(90-e)*(Math.PI/180),o=(t+180)*(Math.PI/180),s=-n*Math.sin(r)*Math.cos(o),i=n*Math.sin(r)*Math.sin(o),a=n*Math.cos(r);return new p.Pq0(s,a,i)};var v=n(579);const x=e=>{let{flights:t,color:n,radius:r,behavior:o}=e;const[s,a]=(0,i.useState)(o?0:1);(0,i.useEffect)((()=>{if("flicker"===o){let e=0;const t=100,n=1e3,r=setInterval((()=>{e+=t,a(Math.random()<.5?0:1),e>=n&&(clearInterval(r),a(1))}),t);return()=>clearInterval(r)}if("smooth"===o){let e=null;const t=performance.now(),n=1e3,r=o=>{const s=o-t,i=Math.min(s/n,1);a(i),i<1&&(e=requestAnimationFrame(r))};return e=requestAnimationFrame(r),()=>{e&&cancelAnimationFrame(e)}}a(1)}),[o]);const l=(0,i.useMemo)((()=>t.map((e=>((e,t,n,r,o)=>{const s=g(e,t,o),i=g(n,r,o),a=(new p.Pq0).addVectors(s,i).multiplyScalar(.5),l=1.5*s.distanceTo(i);a.setLength(a.length()+l);const c=(new p.Pq0).lerpVectors(s,a,.25),u=(new p.Pq0).lerpVectors(s,a,.75),m=new p.s0K(s,c,u,i);return new p.j6(m,64,.5,8,!1)})(e.start.lat,e.start.lon,e.end.lat,e.end.lon,r)))),[t,r]);return(0,v.jsx)(v.Fragment,{children:l.map(((e,t)=>(0,v.jsx)("mesh",{geometry:e,children:(0,v.jsx)("meshBasicMaterial",{color:n,transparent:!0,opacity:s})},t)))})},y=e=>{let{position:t,color:n,onDone:r}=e;const o=(0,i.useRef)(null),s=(0,i.useRef)(null),a=(0,i.useRef)(null),c=1.3,[u,m]=(0,i.useState)(0),[d,f]=(0,i.useState)(0),[h,g]=(0,i.useState)(1);return(0,i.useEffect)((()=>{if(0===t.lengthSq())return;const e=t.clone().normalize(),n=new p.Pq0(0,0,1),r=(new p.PTz).setFromUnitVectors(n,e);o.current.quaternion.copy(r)}),[t]),(0,l.D)((()=>{m(u+.06*(1-u));const e=d+.06*(1-d);f(e);g(1-e),e>.98&&(null===r||void 0===r||r())})),(0,v.jsxs)("group",{ref:o,position:t,children:[(0,v.jsxs)("mesh",{ref:s,scale:[u*c,u*c,u*c],children:[(0,v.jsx)("circleGeometry",{args:[1.5,64]}),(0,v.jsx)("meshBasicMaterial",{color:n,transparent:!0,opacity:1})]}),(0,v.jsxs)("mesh",{ref:a,scale:[d*c,d*c,d*c],children:[(0,v.jsx)("ringGeometry",{args:[10,3.1,64]}),(0,v.jsx)("meshBasicMaterial",{color:n,transparent:!0,opacity:h,side:p.$EB,depthTest:!0})]})]})};class w extends p.Ipv{constructor(e,t,n){super(),this.baseCurve=void 0,this.minT=void 0,this.maxT=void 0,this.baseCurve=e,this.minT=t,this.maxT=n}getPoint(e,t){const n=this.minT+(this.maxT-this.minT)*e;return this.baseCurve.getPoint(n,t)}}const j=e=>{let{color:t,startLat:n,startLon:r,endLat:o,endLon:s,radius:a,animationDuration:c=2500,onDone:u,onProgressPersist:m=!1}=e;const d=(0,i.useRef)(null),f=(0,i.useRef)(null),[h,x]=(0,i.useState)(!1),[j]=(0,i.useState)((()=>performance.now())),[A,S]=(0,i.useState)(!1),C=(0,i.useMemo)((()=>g(n,r,a)),[n,r,a]),P=(0,i.useMemo)((()=>g(o,s,a)),[o,s,a]),D=(0,i.useMemo)((()=>{const e=(new p.Pq0).addVectors(C,P).multiplyScalar(.5),t=C.distanceTo(P);e.setLength(e.length()+t);const n=(new p.Pq0).lerpVectors(C,e,.25),r=(new p.Pq0).lerpVectors(C,e,.75);return new p.s0K(C,n,r,P)}),[C,P]),b=(0,i.useMemo)((()=>new p.j6(D,64,.5,8,!1)),[D]);return(0,i.useMemo)((()=>{f.current=b}),[b]),(0,l.D)((()=>{if(h)return;let e=(performance.now()-j)/c;if(e>1&&(e=1),m){const t=f.current.index?f.current.index.count:f.current.attributes.position.count,n=Math.floor(t*e);f.current.setDrawRange(0,n),e>=1&&(f.current.setDrawRange(0,t),A||S(!0),x(!0),null===u||void 0===u||u())}else{if(!d.current)return;let t=0,n=0;e<=.5?(t=e/.5,n=0):(t=1,n=(e-.5)/.5,A||S(!0));const r=n,o=t;if(o<=r)d.current.visible=!1;else{d.current.visible=!0;const e=new w(D,r,o),t=new p.j6(e,64,.5,8,!1);d.current.geometry&&d.current.geometry.dispose(),d.current.geometry=t}e>=1&&(d.current.visible=!1,x(!0),null===u||void 0===u||u())}})),(0,v.jsxs)(v.Fragment,{children:[(0,v.jsxs)("mesh",{ref:d,children:[m?(0,v.jsx)("primitive",{object:b,attach:"geometry"}):null,(0,v.jsx)("meshBasicMaterial",{color:t,transparent:!0,opacity:.9})]}),A&&(0,v.jsx)(y,{position:P,color:"#dd6ff0",onDone:()=>S(!1)})]})};function A(e){return Math.floor(Math.random()*e)}function S(e){let{locationArray:t,color:n,radius:r,animationDuration:o=2500,firstAnimationDuration:s,onProgressPersist:a=!0,onAllArcsDone:l="persist",persistArcBehavior:c,infiniteRandom:u=!1,spawnInterval:m=1500}=e;const[d,h]=(0,i.useState)([]),[p,g]=(0,i.useState)([]),[y,w]=(0,i.useState)([]),[S,C]=(0,i.useState)(!1),[P,D]=(0,i.useState)(0),b=(0,i.useRef)(null),M=()=>{const e=f(t),n=[];for(let t=0;t<e.length-1;t++)n.push({start:e[t],end:e[t+1]});h(n),g(Array(n.length).fill(!1)),w(Array(n.length).fill(!1)),D(0),C(!1)},R=()=>{const e=f(t);h([]),g([]),w([]),C(!1),b.current||(b.current=setInterval((()=>{const t=function(e){const t=A(e.length);let n=A(e.length);for(;n===t;)n=A(e.length);return{start:e[t],end:e[n]}}(e);h((e=>[...e,t])),g((e=>[...e,!1])),w((e=>[...e,!1]))}),m))};return(0,i.useEffect)((()=>(u?R():M(),()=>{b.current&&(clearInterval(b.current),b.current=null)})),[u,m]),(0,i.useEffect)((()=>{d.forEach(((e,t)=>{if(!p[t]){const e=200*Math.random();setTimeout((()=>{g((e=>{const n=[...e];return n[t]=!0,n}))}),e)}}))}),[d,p]),(0,i.useEffect)((()=>{if(!u&&P===d.length&&d.length>0)switch(l){case"remove":w(Array(d.length).fill(!0));break;case"reset":setTimeout((()=>{M()}),500);break;case"persist":C(!0)}}),[P,d.length,l,u]),(0,i.useEffect)((()=>{if(u&&!a){const e=d.filter(((e,t)=>!y[t]));if(e.length!==d.length){h(e);const t=[],n=[];d.forEach(((e,r)=>{y[r]||(t.push(p[r]),n.push(y[r]))})),g(t),w(n)}}}),[y,d,u,a]),(0,v.jsxs)(v.Fragment,{children:[S&&(0,v.jsx)(x,{flights:d,color:n,radius:r+.1,behavior:c}),!S&&d.map(((e,t)=>{if(!p[t])return null;if(y[t]&&!a)return null;const i=0===t&&s?s:o;return(0,v.jsx)(j,{color:n,startLat:e.start.lat,startLon:e.start.lon,endLat:e.end.lat,endLon:e.end.lon,radius:r+.1,onProgressPersist:a,animationDuration:i,onDone:()=>{w((e=>{const n=[...e];return n[t]=!0,n})),D((e=>e+1))}},t)}))]})}var C=n(9379);const P={uniforms:{uColor:{value:new p.Q1f("#00aaff")},uIntensity:{value:1},uPower:{value:2},uOpacity:{value:.3}},vertexShader:"\n    varying vec3 vNormal;\n    varying vec3 vWorldPos;\n\n    void main() {\n      // Flip the normal so it faces outward on a back-sided sphere\n      vNormal = -normalize(normal);\n\n      vec4 worldPos = modelMatrix * vec4(position, 1.0);\n      vWorldPos = worldPos.xyz;\n\n      gl_Position = projectionMatrix * viewMatrix * worldPos;\n    }\n  ",fragmentShader:"\n    uniform vec3 uColor;\n    uniform float uIntensity;\n    uniform float uPower;\n    uniform float uOpacity;\n    \n    varying vec3 vNormal;\n    varying vec3 vWorldPos;\n\n    void main() {\n      // Calculate the view direction from fragment to camera\n      vec3 viewDir = normalize(cameraPosition - vWorldPos);\n\n      // Because we flipped the normal, this is a more direct Fresnel\n      float fresnelTerm = dot(vNormal, viewDir);\n      fresnelTerm = clamp(fresnelTerm, 0.0, 1.0);\n\n      // Exponential falloff\n      float intensity = pow(fresnelTerm, uPower) * uIntensity;\n\n      // Final color with alpha\n      gl_FragColor = vec4(uColor, intensity * uOpacity);\n    }\n  "},D=e=>{let{earthRadius:t,color:n,opacity:r}=e;const o=(0,i.useRef)(null);return(0,v.jsxs)("mesh",{ref:o,children:[(0,v.jsx)("sphereGeometry",{args:[154.5,64,64]}),(0,v.jsx)("shaderMaterial",{side:p.hsX,transparent:!0,depthWrite:!1,blending:p.EZo,uniforms:(0,C.A)((0,C.A)({},P.uniforms),{},{uColor:{value:new p.Q1f(n)},uIntensity:{value:1},uPower:{value:1.5},uOpacity:{value:r}}),vertexShader:P.vertexShader,fragmentShader:P.fragmentShader})]})},b=e=>{let{radius:t}=e;return(0,v.jsxs)("mesh",{children:[(0,v.jsx)("sphereGeometry",{args:[t,64,64]}),(0,v.jsx)("meshPhongMaterial",{color:"#063985",emissive:"#081c3c",shininess:5,emissiveIntensity:.4,specular:2236962})]})};var M=n(8270);const R=e=>{let{isoA3:t,dots:n}=e;const r=n.filter((e=>e.isoA3===t));if(!r.length)return null;let o=0,s=0,i=0;for(const l of r)o+=l.x,s+=l.y,i+=l.z;const a=r.length;return new p.Pq0(o/a,s/a,i/a)},k=e=>{let{camera:t,controls:n,targetPos:r,distanceOffset:o=300}=e;const s=r.clone().normalize().multiplyScalar(r.length()+o);M.Ay.to(t.position,{x:s.x,y:s.y,z:s.z,duration:1.5,ease:"power1",onUpdate:()=>{n.update()}})};function N(e){if(!e.intersections||0===e.intersections.length)return null;return e.intersections.sort(((e,t)=>e.distance-t.distance))[0]}const U=e=>{let{jsonUrl:t,pointSize:n,onCountrySelect:r,onLoaded:o,dotColor:s,highlightColor:c,globeRef:d,controlsRef:f,cameraRef:h}=e;const g=m(u.mo),[x,y]=(0,i.useState)([]),w=(0,i.useRef)(null),j=(0,i.useRef)(null),A=(0,i.useRef)(null),S=(0,i.useRef)(!1),C=(0,i.useRef)(null),P=(0,a.A)("sm"),[D,b,M]=(0,i.useMemo)((()=>{const e=new p.Q1f(s);return[e.r,e.g,e.b]}),[s]),[U,z,L]=(0,i.useMemo)((()=>{const e=new p.Q1f(c);return[e.r,e.g,e.b]}),[c]);(0,i.useEffect)((()=>{(async()=>{try{const e=await fetch(t),n=await e.json();console.log("Loaded landDots.json:",n),y(n),null===o||void 0===o||o(!0)}catch(e){console.error("Failed to load landDots.json:",e)}})()}),[t]);const Y=(0,i.useCallback)((e=>{if(null===f||void 0===f||!f.current||null===h||void 0===h||!h.current||null===d||void 0===d||!d.current)return;const t=R({isoA3:e,dots:x});if(!t)return;const n=t.clone();d.current.localToWorld(n),k({camera:h.current,controls:f.current,targetPos:n,distanceOffset:P?380:480})}),[h,f,d,x]);(0,i.useEffect)((()=>{g&&0!==x.length?(w.current=g,null!==d&&void 0!==d&&d.current&&Y(g)):w.current=null}),[g,x,d,Y]);const E=(0,i.useMemo)((()=>{if(!x.length)return new Float32Array(0);const e=x.flatMap((e=>[e.x,e.y,e.z]));return new Float32Array(e)}),[x]),I=(0,i.useMemo)((()=>{if(!x.length)return new Float32Array(0);const e=[];for(let t=0;t<x.length;t++)e.push(D,b,M);return new Float32Array(e)}),[x,D,b,M]),F=(0,i.useRef)(null),T=(0,i.useCallback)((e=>{var t;A.current={x:e.clientX,y:e.clientY},S.current=!1,C.current=null;const n=N(e);C.current=null!==(t=null===n||void 0===n?void 0:n.index)&&void 0!==t?t:null,e.stopPropagation()}),[]),O=(0,i.useCallback)((e=>{if(!A.current)return;const t=e.clientX-A.current.x,n=e.clientY-A.current.y;Math.sqrt(t*t+n*n)>20&&(S.current=!0),e.stopPropagation()}),[]),B=(0,i.useCallback)((e=>{if(!x.length||!C.current)return;const t=N(e);if(!t)return;if(t.index!==C.current||S.current)return A.current=null,void(C.current=null);const n=t.index,o=x[n];o&&(console.log("Clicked dot #".concat(n," \u2192 Country=").concat(o.countryName,", ISO=").concat(o.isoA3)),null===r||void 0===r||r(o.isoA3),Y(o.isoA3),w.current=o.isoA3,j.current&&clearTimeout(j.current),j.current=setTimeout((()=>{w.current=null}),2e3),A.current=null,C.current=null,S.current=!1,e.stopPropagation())}),[x,r,Y]);return(0,l.D)((()=>{if(!F.current||!x.length)return;const e=F.current.array;for(let t=0;t<x.length;t++){const n=x[t],r=3*t;w.current===n.isoA3?(e[r]=U,e[r+1]=z,e[r+2]=L):(e[r]=D,e[r+1]=b,e[r+2]=M)}F.current.needsUpdate=!0})),x.length?(0,v.jsxs)("points",{onPointerDown:T,onPointerMove:O,onPointerUp:B,children:[(0,v.jsxs)("bufferGeometry",{children:[(0,v.jsx)("bufferAttribute",{attach:"attributes-position",args:[E,3],count:E.length/3,itemSize:3}),(0,v.jsx)("bufferAttribute",{ref:F,attach:"attributes-color",args:[I,3],count:I.length/3,itemSize:3})]}),(0,v.jsx)("pointsMaterial",{vertexColors:!0,size:n,sizeAttenuation:!0,transparent:!0,opacity:.8})]}):null};function z(e){let{radius:t=150,scaleFactor:n=1.009,color:r="#00aaff",power:o=5,intensity:s=1.5,opacity:a=.8}=e;const l=(0,i.useRef)(null);return(0,v.jsxs)("mesh",{ref:l,scale:[n,n,n],children:[(0,v.jsx)("sphereGeometry",{args:[t,128,128]}),(0,v.jsx)("shaderMaterial",{vertexShader:"\n          varying vec3 vNormal;\n          varying vec3 vViewPosition;\n          \n          void main() {\n            vNormal = normalize(normalMatrix * normal);\n            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n            vViewPosition = -mvPosition.xyz;\n            gl_Position = projectionMatrix * mvPosition;\n          }\n        ",fragmentShader:"\n          uniform vec3 uColor;\n          uniform float uIntensity;\n          uniform float uOpacity;\n          uniform float uPower;\n          \n          varying vec3 vNormal;\n          varying vec3 vViewPosition;\n          \n          void main() {\n            vec3 normal = normalize(vNormal);\n            vec3 viewDir = normalize(vViewPosition);\n            \n            float rim = 1.0 - abs(dot(viewDir, normal));\n            rim = pow(rim, uPower) * uIntensity;\n            \n            gl_FragColor = vec4(uColor * rim, rim * uOpacity);\n          }\n        ",uniforms:{uColor:{value:new p.Q1f(r)},uIntensity:{value:s},uOpacity:{value:a},uPower:{value:o}},transparent:!0,side:p.hsX,depthWrite:!1,blending:p.EZo})]})}const L=e=>{let{radius:t,rotationSpeed:n,arcs:r,atmosphere:o,dots:s,cityMarkers:d}=e;const f=(0,i.useRef)(null),p=(0,a.A)("md"),g=(0,a.A)("sm"),x=(0,a.A)("xs");let y=1;y=p?1:g?.8:x?.7:.6;const[w,j]=(0,i.useState)(.55),[A,C]=(0,i.useState)(!1),P=m(u.mo),[M,R]=(0,i.useState)([]),[k,N]=(0,i.useState)(0);return(0,i.useEffect)((()=>{var e,t;if(R([]),!P)return;console.log("ISO FOCUSED!",P);const n=h.filter((e=>e.countries.includes(P)));console.log("Matched trips",n),N((e=>e+1));const r=n.flatMap((e=>function(e){const t=[],n=e.legs;for(let r=0;r<n.length-1;r++)t.push({start:n[r],end:n[r+1]});return t}(e)));console.log("All arcs",r),R(r),null!==s&&void 0!==s&&null!==(e=s.controlsRef)&&void 0!==e&&e.current&&null!==s&&void 0!==s&&null!==(t=s.cameraRef)&&void 0!==t&&t.current&&f.current}),[P]),(0,l.D)(((e,t)=>{if(!f.current)return;P||(f.current.rotation.y+=n);j((e=>(0,c.Cc)(e,y,2*t)))})),(0,v.jsxs)("group",{visible:A,ref:f,scale:w,children:[(0,v.jsx)(b,{radius:t-1}),!!o&&(0,v.jsx)(D,{earthRadius:t-2,color:o.color,opacity:o.opacity}),(0,v.jsx)(z,{radius:150}),!!s&&(0,v.jsx)(U,{jsonUrl:s.jsonUrl,dotColor:s.dotColor,pointSize:s.pointSize,onLoaded:e=>C(e),globeRef:f,controlsRef:s.controlsRef,cameraRef:s.cameraRef,highlightColor:s.highlightColor}),!!r&&!M.length&&(0,v.jsx)(S,{animationDuration:r.animationDuration,color:r.color,locationArray:r.locationArray,onAllArcsDone:r.onAllArcsDone,onProgressPersist:r.onProgressPersist,radius:r.radius,infiniteRandom:r.infiniteRandom,persistArcBehavior:r.persistArcBehavior}),M.length>0&&!!r&&(0,v.jsx)(S,{locationArray:M,color:r.color,radius:E,firstAnimationDuration:1500,animationDuration:500,onProgressPersist:!1,onAllArcsDone:"remove",persistArcBehavior:void 0},k)]})},Y=e=>{let{axesHelperRef:t,cameraRef:n}=e;return(0,i.useEffect)((()=>{t.current&&(t.current.visible=!0)}),[t]),(0,v.jsxs)(v.Fragment,{children:[(0,v.jsx)("primitive",{ref:t,object:new p.IzY(500).setColors("red","white","blue")}),(0,v.jsx)("gridHelper",{args:[1e3,50]}),(0,v.jsx)("primitive",{object:new p.IWo(new p.eaF(new p.Gu$(E)))}),n.current&&(0,v.jsx)("primitive",{object:new p.WTh(n.current)}),(0,v.jsx)("polarGridHelper",{args:[E,16,8,64]})]})},E=150,I=e=>{let{enableHelpers:t}=e;const n=(0,i.useRef)(null),r=(0,i.useRef)(null),l=(0,i.useRef)(null),c=(0,a.A)("sm")?"/landDots-150rad-40k.json":"/landDots-150rad-30k.json",u=(0,a.A)("xl"),m=(0,a.A)("sm");return(0,v.jsxs)(s.Hl,{gl:{alpha:!0},style:{background:"transparent"},camera:{position:[0,400,900],fov:35},onCreated:e=>{l.current=e.camera,e.camera.updateProjectionMatrix();const t=u?.2*e.size.width:0,n=m?0:.07*e.size.height;e.camera.setViewOffset(e.size.width,e.size.height,t,n,e.size.width,e.size.height),e.raycaster.params.Points.threshold=2},children:[(0,v.jsx)(o.N,{ref:n,enableDamping:!0,minDistance:300,minPolarAngle:.3,maxPolarAngle:Math.PI-.3,enablePan:!1,maxDistance:600}),(0,v.jsx)("directionalLight",{intensity:2,position:[-300,200,100]}),(0,v.jsx)("hemisphereLight",{intensity:.5,position:[100,100,0]}),(0,v.jsx)(i.Suspense,{fallback:null,children:(0,v.jsx)(L,{rotationSpeed:2e-4,radius:E,dots:{dotColor:"#44ff00",highlightColor:"#86d4fc",pointSize:2.5,jsonUrl:c,controlsRef:n,cameraRef:l},atmosphere:{color:"#00aaff",opacity:.03,earthRadius:E},arcs:{locationArray:d(h),color:"#dd6ff0",radius:E,animationDuration:1e3,onProgressPersist:!1,infiniteRandom:!0,persistArcBehavior:void 0},cityMarkers:{cities:f(d(h)),radius:E,color:"#dd6ff0",markerSize:1}})}),t&&(0,v.jsx)(Y,{axesHelperRef:r,cameraRef:l})]})},F=()=>{(function(e){Array.from(new Set(e.flatMap((e=>{var t;return null!==(t=e.countries)&&void 0!==t?t:[]}))))})(h),Array.from(new Set(f(d(h))));return(0,v.jsxs)("div",{className:"relative w-full h-full",children:[(0,v.jsx)("div",{className:"absolute inset-0 pointer-events-auto",children:(0,v.jsx)(I,{})}),(0,v.jsx)("div",{className:"flex absolute top-0 right-0 w-full lg:w-1/2 h-full items-end lg:items-center justify-center pointer-events-none z-10",children:(0,v.jsxs)("div",{className:"flex flex-col pointer-events-auto text-2xl items-center px-2 pb-8 sm:text-4xl sm:flex-start lg:pb-0 sm:px-0",children:[(0,v.jsx)("div",{className:"flex mb-2 sm:mb-4",children:"Travels in 2024"}),(0,v.jsx)("div",{className:"flex flex-row gap-2"})]})})]})},T=()=>{const{projectSlug:e}=(0,r.g)();return"earth"===e?(0,v.jsx)(F,{}):(0,v.jsx)("div",{children:"Oops! Project not found."})}},1893:(e,t,n)=>{n.d(t,{A:()=>s});var r=n(5043);const o={xs:320,sm:640,md:768,lg:1024,xl:1280,"2xl":1536},s=e=>{const[t,n]=(0,r.useState)(!1);return(0,r.useEffect)((()=>{function t(){const t=window.innerWidth>=o[e];n((e=>e!==t?t:e))}return window.addEventListener("resize",t),t(),()=>window.removeEventListener("resize",t)}),[e]),t}}}]);
//# sourceMappingURL=156.4f02c463.chunk.js.map