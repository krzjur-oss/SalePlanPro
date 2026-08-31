import{r as N,j as e,d as bt}from"./vendor-react-NQNxyWao.js";import{f as Dt,a as ye,c as Lt}from"./index-B3x_WFOj.js";import{n as F,a6 as Et,C as Ue,d as Mt,X as Rt}from"./vendor-lucide-BzWLwViq.js";import"./vendor-motion-FDUFV107.js";const Y=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek"];function I(x){return String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Be(x,V){const $=[];let O=null;return x.forEach((L,xe)=>{const q=L.floor.buildingIdx,ee=V[q],U=(ee==null?void 0:ee.name)||"",ae=L.floor.id,B=L.floor.name,re=`${q}|${ae}`;!O||O.key!==re?(O={startIdx:xe,span:1,key:re,name:B,buildingName:U},$.push(O)):O.span++}),$}function He(x){const V=[];let $=null;return x.forEach((O,L)=>{var B,re;const xe=O.floor.buildingIdx,q=O.floor.id,ee=((B=O.seg)==null?void 0:B.id)||"default_seg",U=((re=O.seg)==null?void 0:re.name)||"Główny",ae=`${xe}|${q}|${ee}`;!$||$.key!==ae?($={startIdx:L,span:1,key:ae,name:U},V.push($)):$.span++}),V}function Ut({appState:x,schedData:V}){var lt;const[$,O]=N.useState("classes"),[L,xe]=N.useState("etap1"),[q,ee]=N.useState("all"),[U,ae]=N.useState("all"),[B,re]=N.useState("all"),[ut,we]=N.useState(!1),[ht,Ye]=N.useState(!1),[Le,_e]=N.useState(!1),[me,Ze]=N.useState("landscape"),[Ne,Ee]=N.useState(!1),[le,Ve]=N.useState("landscape"),[ke,ft]=N.useState("floors"),[ve,gt]=N.useState("all"),[pe,jt]=N.useState(12),[be,yt]=N.useState("all"),[ue,wt]=N.useState("all"),[Tt,Gt]=N.useState(1),[Nt,ze]=N.useState(!1),[Me,kt]=N.useState(1),[Re,vt]=N.useState("all"),[ie,qe]=N.useState(!0);N.useEffect(()=>{try{Ye(window.self!==window.top)}catch{Ye(!0)}},[]),N.useEffect(()=>{if(Le||Ne){let t=document.querySelector('meta[name="viewport"]');const c=t?t.getAttribute("content"):"";t||(t=document.createElement("meta"),t.setAttribute("name","viewport"),document.head.appendChild(t));const s=Ne?le:me,o=s==="landscape"?"1120":"794";t.setAttribute("content",`width=${o}, initial-scale=0.8, shrink-to-fit=no`);const r=document.createElement("style");return r.id="print-mobile-viewport-adjustments",r.innerHTML=`
        @media print {
          @page {
            size: ${s};
            margin: 6mm 8mm;
          }
          html, body {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #weekly-print-overlay, #rooms-print-overlay {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `,document.head.appendChild(r),()=>{t&&(c?t.setAttribute("content",c):t.removeAttribute("content"));const n=document.getElementById("print-mobile-viewport-adjustments");n&&n.remove()}}},[Le,me,Ne,le]);const b=x.planLekcji,he=N.useMemo(()=>{const t=x.yearLabel||"",c=t.match(/(\d{4})/);let s=new Date().getFullYear(),o=s+1;if(c){s=parseInt(c[1],10);const r=t.match(/\d{4}.*?(\d{4})/);r?o=parseInt(r[1],10):o=s+1}return{start:`${s}-09-01`,end:`${o}-06-25`}},[x.yearLabel]),[Te,Je]=N.useState(he.start),[Ge,Qe]=N.useState(he.end),[Oe,zt]=N.useState("[Przedmiot] - [Klasa] [Sala]");N.useEffect(()=>{Je(he.start),Qe(he.end)},[he]);const Xe=(t,c)=>{const s=new Date(t),o=c+1,r=s.getDay();let n=o-r;n<0&&(n+=7);const l=new Date(s);return l.setDate(s.getDate()+n),l},de=t=>{const c=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0"),r=String(t.getHours()).padStart(2,"0"),n=String(t.getMinutes()).padStart(2,"0"),l=String(t.getSeconds()).padStart(2,"0");return`${c}${s}${o}T${r}${n}${l}`},et=t=>{const c=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0");return`${c}${s}${o}T235959Z`},ce=t=>t?t.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n").trim():"",tt=["MO","TU","WE","TH","FR"],st=t=>{const c=[];for(let s=0;s<5;s++)te.forEach((o,r)=>{const n=String(o.num);let l=[];L==="etap1"?Object.entries(b.lessons).forEach(([a,d])=>{var g,j;const i=a.split("|"),p=i[0],u=parseInt(i[1],10),m=parseInt(i[2],10);if(u===s&&m===r){const y=b.assignments.find(w=>w.id===d.assignmentId);if(y&&y.teacherId===t.id){const w=((g=ne.get(y.subjectId))==null?void 0:g.name)||"Inny",f=((j=fe.get(p))==null?void 0:j.name)||"Inna",z=y.roomId?ge.get(y.roomId):null;l.push({subject:w,className:f,roomName:z==null?void 0:z.name})}}}):(((Pe.teachers[t.id]||{})[s]||{})[n]||[]).forEach(p=>{var u;l.push({subject:p.subject,className:p.className||((u=p.classes)==null?void 0:u.join("+"))||"Klasa",roomName:p.note})}),l.forEach(a=>{c.push({dayIdx:s,hourNum:o.num,start:o.start,end:o.end,subject:a.subject,className:a.className,roomName:a.roomName})})});return c},at=t=>{const c=st(t);if(c.length===0){alert(`Nauczyciel ${t.last} ${t.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);return}let s=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"];c.forEach(a=>{const d=Xe(Te,a.dayIdx),[i,p]=a.start.split(":").map(Number),[u,m]=a.end.split(":").map(Number),g=new Date(d);g.setHours(i,p,0,0);const j=new Date(d);j.setHours(u,m,0,0);const y=Oe.replace("[Przedmiot]",a.subject).replace("[Klasa]",a.className).replace("[Sala]",a.roomName?`s. ${a.roomName}`:"").replace(/\s+/g," ").trim(),w=`Lekcja: ${a.hourNum} (${a.start}-${a.end})\\nNauczyciel: ${t.last} ${t.first} (${t.abbr})\\nKlasa: ${a.className}\\n`+(a.roomName?`Sala: ${a.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",f=a.roomName?`Sala ${a.roomName}`:"",z=`asg-${t.id}-${a.dayIdx}-${a.hourNum}-${a.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}@saleplan.pro`,v=new Date(Ge);s.push("BEGIN:VEVENT"),s.push(`UID:${z}`),s.push(`DTSTAMP:${de(new Date)}Z`),s.push(`DTSTART:${de(g)}`),s.push(`DTEND:${de(j)}`),s.push(`RRULE:FREQ=WEEKLY;UNTIL=${et(v)};BYDAY=${tt[a.dayIdx]}`),s.push(`SUMMARY:${ce(y)}`),s.push(`LOCATION:${ce(f)}`),s.push(`DESCRIPTION:${ce(w)}`),s.push("END:VEVENT")}),s.push("END:VCALENDAR");const o=s.join(`\r
`),r=new Blob([o],{type:"text/calendar;charset=utf-8"}),n=URL.createObjectURL(r),l=document.createElement("a");l.href=n,l.download=`plan_${t.last}_${t.first}.ics`,document.body.appendChild(l),l.click(),document.body.removeChild(l),URL.revokeObjectURL(n)},$t=()=>{let t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"],c=0;if(b.teachers.forEach(l=>{st(l).forEach(d=>{c++;const i=Xe(Te,d.dayIdx),[p,u]=d.start.split(":").map(Number),[m,g]=d.end.split(":").map(Number),j=new Date(i);j.setHours(p,u,0,0);const y=new Date(i);y.setHours(m,g,0,0);const w=`[${l.abbr}] `+Oe.replace("[Przedmiot]",d.subject).replace("[Klasa]",d.className).replace("[Sala]",d.roomName?`s. ${d.roomName}`:"").replace(/\s+/g," ").trim(),f=`Nauczyciel: ${l.last} ${l.first} (${l.abbr})\\nLekcja: ${d.hourNum} (${d.start}-${d.end})\\nKlasa: ${d.className}\\n`+(d.roomName?`Sala: ${d.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",z=d.roomName?`Sala ${d.roomName}`:"",v=`asg-all-${l.id}-${d.dayIdx}-${d.hourNum}-${d.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}-${c}@saleplan.pro`,h=new Date(Ge);t.push("BEGIN:VEVENT"),t.push(`UID:${v}`),t.push(`DTSTAMP:${de(new Date)}Z`),t.push(`DTSTART:${de(j)}`),t.push(`DTEND:${de(y)}`),t.push(`RRULE:FREQ=WEEKLY;UNTIL=${et(h)};BYDAY=${tt[d.dayIdx]}`),t.push(`SUMMARY:${ce(w)}`),t.push(`LOCATION:${ce(z)}`),t.push(`DESCRIPTION:${ce(f)}`),t.push("END:VEVENT")})}),c===0){alert("Brak przypisanych lekcji w całym planie lekcji.");return}t.push("END:VCALENDAR");const s=t.join(`\r
`),o=new Blob([s],{type:"text/calendar;charset=utf-8"}),r=URL.createObjectURL(o),n=document.createElement("a");n.href=r,n.download="plan_wszyscy_nauczyciele.ics",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(r)},fe=N.useMemo(()=>new Map(b.classes.map(t=>[t.id,t])),[b.classes]),We=N.useMemo(()=>new Map(b.teachers.map(t=>[t.id,t])),[b.teachers]),ne=N.useMemo(()=>new Map(b.subjects.map(t=>[t.id,t])),[b.subjects]),ge=N.useMemo(()=>new Map(b.rooms.map(t=>[t.id,t])),[b.rooms]),$e=N.useMemo(()=>new Map((b.schoolGroups||[]).map(t=>[t.id,t])),[b.schoolGroups]),Ie=(t,c)=>{if(c&&c.short&&String(c.short).trim())return String(c.short).trim();const s=b.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(s&&s.short&&s.short.trim())return s.short.trim();const o=x.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(o&&o.short&&o.short.trim())return o.short.trim();const r=(s==null?void 0:s.name)||(o==null?void 0:o.name)||t||"";if(!r)return"";if(r.length<=4)return r;const n=r.toLowerCase();return n.includes("angielsk")?"ang":n.includes("polsk")?"pol":n.includes("matemat")?"mat":n.includes("fizyk")?"fiz":n.includes("chem")?"chem":n.includes("biolog")?"biol":n.includes("geograf")?"geogr":n.includes("histor")?"hist":n.includes("informat")?"inf":n.includes("fizyczn")||n.includes("w-f")||n.includes("wf")?"WF":n.includes("relig")?"rel":n.includes("muzyk")?"muz":n.includes("plastyk")?"plas":n.includes("technik")?"tech":n.includes("niemieck")?"niem":n.includes("hiszpań")||n.includes("hiszpan")?"hiszp":n.includes("francusk")?"franc":n.includes("rosyjsk")?"ros":n.includes("etyk")?"etyka":n.includes("godzina wychowawcza")||n.includes("zajęcia z wychowawcą")?"GW":n.includes("edukacja wczesnoszkolna")?"EW":n.includes("edukacja dla bezpieczeństwa")?"EDB":n.includes("wiedza o społeczeństwie")?"WOS":n.includes("historia i teraźniejszość")?"HIT":r.slice(0,4)},Ae=(t,c)=>{if(!t)return"";const s=String(t).trim();if(!s)return"";const o=(b.schoolGroups||[]).find(d=>d.id===s||d.name.toLowerCase()===s.toLowerCase()),r=o?o.name.trim():s;if(/^g\s*\d+$/i.test(r))return r.toUpperCase().replace(/\s+/,"");const n=r.match(/^grupa\s*(\d+|[a-zA-Z]+)/i);if(n)return`G${n[1].toUpperCase()}`;const l=r.match(/^gr\.?\s*(\d+|[a-zA-Z]+)/i);if(l)return`G${l[1].toUpperCase()}`;if(/^\d+$/.test(r))return`G${r}`;if(/^1\/2$/i.test(r)||/^gr\.?\s*1\/2$/i.test(r))return"G1";if(/^2\/2$/i.test(r)||/^gr\.?\s*2\/2$/i.test(r))return"G2";if(r.toLowerCase()==="chłopcy"||r.toLowerCase()==="chlopcy")return"chł";if(r.toLowerCase()==="dziewczęta"||r.toLowerCase()==="dziewczeta")return"dz";const a=r.toLowerCase();if(a.includes("relig")||a.includes("mniejszoś")||a.includes("mniejszos")||a.includes("hiszpań")||a.includes("hiszpan")||a.includes("niemieck")||a.includes("angielsk")||a.includes("informat")||a.includes("etyk")||a.includes("fizyczn")||a.includes("wf"))return"";if(c){const d=c.toLowerCase();if(a.includes(d)||d.includes(a))return""}return r.length<=4&&!/^[A-Z0-9]{3,}$/.test(r)?r:""},te=N.useMemo(()=>b.hours&&b.hours.length>0?b.hours:[{num:1,start:"08:00",end:"08:45"},{num:2,start:"08:55",end:"09:40"},{num:3,start:"09:50",end:"10:35"},{num:4,start:"10:55",end:"11:40"},{num:5,start:"11:50",end:"12:35"}],[b.hours]),Pe=N.useMemo(()=>{const t=x.yearKey,c=V[t]||{},s={},o={},r={};return Object.entries(c).forEach(([n,l])=>{const a=parseInt(n,10);Object.entries(l).forEach(([d,i])=>{Object.entries(i).forEach(([p,u])=>{(Array.isArray(u)?u:[u]).forEach(g=>{var f,z,v;if(!g)return;const j=p.split("_"),y=j[j.length-1]||"";if(g.classes&&g.classes.length>0)g.classes.forEach(h=>{var P;const A=((P=b.classes.find(k=>k.name===h))==null?void 0:P.id)||h;s[A]||(s[A]={}),s[A][a]||(s[A][a]={}),s[A][a][d]||(s[A][a][d]=[]),s[A][a][d].push({...g,note:y})});else if(g.className){const h=((f=b.classes.find(A=>A.name===g.className))==null?void 0:f.id)||g.className;s[h]||(s[h]={}),s[h][a]||(s[h][a]={}),s[h][a][d]||(s[h][a][d]=[]),s[h][a][d].push({...g,note:y})}const w=g.teacherAbbr;if(w){const h=((z=b.teachers.find(A=>A.abbr===w))==null?void 0:z.id)||w;o[h]||(o[h]={}),o[h][a]||(o[h][a]={}),o[h][a][d]||(o[h][a][d]=[]),o[h][a][d].push({...g,note:y})}if(y){const h=((v=b.rooms.find(A=>A.name===y))==null?void 0:v.id)||y;r[h]||(r[h]={}),r[h][a]||(r[h][a]={}),r[h][a][d]||(r[h][a][d]=[]),r[h][a][d].push({...g,note:y})}})})})}),{classes:s,teachers:o,rooms:r}},[V,x.yearKey,b.classes,b.teachers,b.rooms]),It=()=>{window.print()},rt=(t,c)=>{if(!c||c<=0||t.length<=c)return[t];const s=[];for(let o=0;o<t.length;o+=c)s.push(t.slice(o,o+c));return s},Ke=(t,c,s,o)=>{var l,a,d;const r=[];if(L==="etap1"){const i=new Set;Object.entries(b.lessons).forEach(([p,u])=>{var f,z;const m=p.split("|"),g=m[0],j=parseInt(m[1],10),y=parseInt(m[2],10),w=m[3]||null;if(j===c&&y===o){const v=b.assignments.find(h=>h.id===u.assignmentId);if(v){const h=b.rooms.find(P=>P.id===v.roomId);if(v.roomId===t.room.id||h&&h.name.toLowerCase().trim()===t.room.num.toLowerCase().trim()){const P=`${v.id}-${g}-${v.groupId||w||""}`;if(i.has(P))return;i.add(P);const k=ne.get(v.subjectId)||b.subjects.find(E=>E.id===v.subjectId),R=(k==null?void 0:k.name)||"Przedmiot",W=(k==null?void 0:k.short)||Ie(v.subjectId,k);let S=((f=fe.get(g))==null?void 0:f.name)||"Klasa";if(v.linkedClassIds&&v.linkedClassIds.length>0){const E=v.linkedClassIds.map(X=>{var Z;return(Z=fe.get(X))==null?void 0:Z.name}).filter(Boolean);S=[S,...E].join("+")}const T=S.replace(/\s*\([^)]*\)/g,"").trim()||S,G=v.groupId||w,C=G?b.schoolGroups.find(E=>E.id===G)||$e.get(G):null,H=C?C.name:G||void 0,J=Ae(H,W||R),D=v.teacherId&&((z=We.get(v.teacherId))==null?void 0:z.abbr)||"",Q=[T,W,J,D].filter(Boolean).join(" ");r.push({subject:R,subjectShort:W,className:T,groupName:H,groupShort:J,teacherAbbr:D,displayText:Q})}}}})}else{const i=Lt(t),p=(d=(a=(l=V[x.yearKey])==null?void 0:l[c])==null?void 0:a[s])==null?void 0:d[i];(Array.isArray(p)?p:p?[p]:[]).forEach(m=>{var T,G,C,H,J;if(!m)return;const g=m.className||((T=m.classes)==null?void 0:T.join("+"))||"Klasa";let j=g,y="";const w=g.match(/\(([^)]+)\)/);w&&(y=w[1].trim(),j=g.replace(/\s*\([^)]*\)/g,"").trim()||g);const f=((G=m._bridgeMeta)!=null&&G.subjectId?ne.get(m._bridgeMeta.subjectId)||b.subjects.find(D=>{var _;return D.id===((_=m._bridgeMeta)==null?void 0:_.subjectId)}):null)||b.subjects.find(D=>D.name.toLowerCase().trim()===(m.subject||"").toLowerCase().trim()),z=m.subject||(f==null?void 0:f.name)||"Przedmiot",v=(f==null?void 0:f.short)||Ie(m.subject,f);let h=(C=m._bridgeMeta)==null?void 0:C.groupId;if(!h&&((H=m._bridgeMeta)!=null&&H.classId)&&((J=m._bridgeMeta)!=null&&J.subjectId)){const D=b.assignments.find(_=>{var Q,E,X,Z;return _.classId===((Q=m._bridgeMeta)==null?void 0:Q.classId)&&_.subjectId===((E=m._bridgeMeta)==null?void 0:E.subjectId)&&(!((X=m._bridgeMeta)!=null&&X.teacherId)||_.teacherId===((Z=m._bridgeMeta)==null?void 0:Z.teacherId))});D!=null&&D.groupId&&(h=D.groupId)}if(!h&&y&&(h=y),!h&&m.note){const D=m.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);D&&(h=D[0])}const A=h?b.schoolGroups.find(D=>D.id===h)||$e.get(h):null,P=A?A.name:h||void 0,k=Ae(P,v||z),R=m.teacherAbbr||"",S=[j,v,k,R].filter(Boolean).join(" ");r.push({subject:z,subjectShort:v,className:j,groupName:P,groupShort:k,teacherAbbr:R,displayText:S})})}const n=new Set;return r.filter(i=>{const p=`${i.className}|${i.subjectShort}|${i.groupShort}|${i.teacherAbbr}`;return n.has(p)?!1:(n.add(p),!0)})},nt=(t,c,s,o)=>{var a,d,i,p;const r=[],n=String(s);if(L==="etap1"){const u=new Set;Object.entries(b.lessons).forEach(([m,g])=>{var v;const j=m.split("|"),y=j[0],w=parseInt(j[1],10),f=parseInt(j[2],10),z=j[3]||null;if(w===c&&f===o){const h=b.assignments.find(A=>A.id===g.assignmentId);if(h&&h.teacherId===t.id){const A=`${h.id}-${y}-${h.groupId||z||""}`;if(u.has(A))return;u.add(A);const P=ne.get(h.subjectId)||b.subjects.find(E=>E.id===h.subjectId),k=(P==null?void 0:P.name)||"Przedmiot",R=(P==null?void 0:P.short)||Ie(h.subjectId,P);let W=((v=fe.get(y))==null?void 0:v.name)||"Klasa";if(h.linkedClassIds&&h.linkedClassIds.length>0){const E=h.linkedClassIds.map(X=>{var Z;return(Z=fe.get(X))==null?void 0:Z.name}).filter(Boolean);W=[W,...E].join("+")}const S=W.replace(/\s*\([^)]*\)/g,"").trim()||W,T=h.groupId||z,G=T?b.schoolGroups.find(E=>E.id===T)||$e.get(T):null,C=G?G.name:T||void 0,H=Ae(C,R||k),J=h.roomId?ge.get(h.roomId)||b.rooms.find(E=>E.id===h.roomId):null,D=(J==null?void 0:J.name)||(h.roomId?String(h.roomId):""),Q=[k,S+(H?` (${H})`:""),D?`s. ${D}`:""].filter(Boolean).join(" • ");r.push({subject:k,subjectShort:R,className:S,groupName:C,groupShort:H,roomName:D,displayText:Q})}}})}else{const u=x.yearKey,m=((d=(a=V[u])==null?void 0:a[c])==null?void 0:d[n])||((p=(i=V[u])==null?void 0:i[c])==null?void 0:p[s])||{},g=new Set;Object.entries(m).forEach(([j,y])=>{(Array.isArray(y)?y:y?[y]:[]).forEach(f=>{var _,Q,E,X,Z,it,dt;if(!f||f.teacherAbbr!==t.abbr&&((_=f._bridgeMeta)==null?void 0:_.teacherId)!==t.id)return;let z=f.note||"";if(!z&&((Q=f._bridgeMeta)!=null&&Q.roomId)){const M=ge.get(f._bridgeMeta.roomId)||b.rooms.find(K=>K.id===f._bridgeMeta.roomId);M&&(z=M.name)}if(!z&&j){const M=b.rooms.find(K=>K.id===j||K.name===j||K.name&&j&&K.name.toLowerCase()===j.toLowerCase());M&&(z=M.name)}const v=f.className||((E=f.classes)==null?void 0:E.join("+"))||"Klasa";let h=v,A="";const P=v.match(/\(([^)]+)\)/);P&&(A=P[1].trim(),h=v.replace(/\s*\([^)]*\)/g,"").trim()||v);const k=((X=f._bridgeMeta)!=null&&X.subjectId?ne.get(f._bridgeMeta.subjectId)||b.subjects.find(M=>{var K;return M.id===((K=f._bridgeMeta)==null?void 0:K.subjectId)}):null)||b.subjects.find(M=>M.name.toLowerCase().trim()===(f.subject||"").toLowerCase().trim()),R=f.subject||(k==null?void 0:k.name)||"Przedmiot",W=(k==null?void 0:k.short)||Ie(f.subject,k);let S=(Z=f._bridgeMeta)==null?void 0:Z.groupId;if(!S&&((it=f._bridgeMeta)!=null&&it.classId)&&((dt=f._bridgeMeta)!=null&&dt.subjectId)){const M=b.assignments.find(K=>{var ct,xt,mt,pt;return K.classId===((ct=f._bridgeMeta)==null?void 0:ct.classId)&&K.subjectId===((xt=f._bridgeMeta)==null?void 0:xt.subjectId)&&(!((mt=f._bridgeMeta)!=null&&mt.teacherId)||K.teacherId===((pt=f._bridgeMeta)==null?void 0:pt.teacherId))});M!=null&&M.groupId&&(S=M.groupId)}if(!S&&A&&(S=A),!S&&f.note){const M=f.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);M&&(S=M[0])}const T=S?b.schoolGroups.find(M=>M.id===S)||$e.get(S):null,G=T?T.name:S||void 0,C=Ae(G,W||R),H=`${R}-${h}-${C||""}-${z}`;if(g.has(H))return;g.add(H);const D=[R,h+(C?` (${C})`:""),z?`s. ${z}`:""].filter(Boolean).join(" • ");r.push({subject:R,subjectShort:W,className:h,groupName:G,groupShort:C,roomName:z,displayText:D})})})}const l=new Set;return r.filter(u=>{const m=`${u.className}|${u.subjectShort}|${u.groupShort}|${u.roomName}`;return l.has(m)?!1:(l.add(m),!0)})},se=(t,c,s)=>{var n,l,a;if(!((n=x.dyzury)!=null&&n.harmonogram)||!((l=x.dyzury)!=null&&l.miejsca))return[];const o=[],r=(a=x.dyzury.przerwy)==null?void 0:a.find(d=>d.num===s);return x.dyzury.miejsca.forEach(d=>{const i=`${d.id}|${c}|${s}`,p=x.dyzury.harmonogram[i];p&&p.teacherAbbr===t&&o.push({placeName:d.name,floor:d.floor,desc:d.desc,note:p.note,breakName:(r==null?void 0:r.name)||`Przerwa ${s}`,start:(r==null?void 0:r.start)||"",end:(r==null?void 0:r.end)||""})}),o},At=()=>{const t=je,c=be==="all"?[0,1,2,3,4]:[be],s=ue==="all"?t:t.filter(r=>r.id===ue);let o="";return c.forEach(r=>{s.forEach(n=>{const l=rt(n.cols,pe>0?pe:n.cols.length);l.forEach((a,d)=>{const i=a.length,p=Be(a,x.buildings),u=He(a);let m="4px 3px",g="3px 2px",j="10px",y="8.5px",w="9px",f="8.5px",z="10.5px",v="7.5px",h=!0;i>14?(m="2px 1px",g="2px 1px",j="8.5px",y="7.5px",w="8px",f="7.5px",z="8px",v="6.5px",h=!1):i>10&&(m="3px 2px",g="2.5px 1.5px",j="9px",y="8px",w="8.5px",f="8px",z="9.5px",v="7px");let A="";te.forEach((k,R)=>{let W="";a.forEach(S=>{const T=Ke(S,r,k.num,R);let G='<span style="color: #cbd5e1; font-weight: bold; font-family: monospace;">-</span>';T.length>0&&(G=T.map(C=>`
                  <div style="line-height: 1.15; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 1px 0;" title="${I(C.displayText)} (${I(C.subject)})">
                    <div style="color: #0f172a; font-weight: 900; font-size: ${j}; letter-spacing: -0.01em;">
                      ${I(C.className)}
                    </div>
                    ${C.groupShort?`
                      <div style="color: #4338ca; font-weight: 800; font-size: ${y};">
                        ${I(C.groupShort)}
                      </div>`:""}
                    <div style="color: #1e293b; font-weight: 800; font-size: ${w}; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${I(C.subjectShort||C.subject)}
                    </div>
                    ${C.teacherAbbr?`
                      <div style="color: #334155; font-weight: 700; font-family: monospace; font-size: ${f};">
                        ${I(C.teacherAbbr)}
                      </div>`:""}
                  </div>
                `).join('<div style="border-top: 1px dashed #cbd5e1; margin: 2px 0; width: 80%;"></div>')),W+=`
                <td style="border: 1px solid #94a3b8; padding: ${g}; text-align: center; vertical-align: middle; background: #fff; width: calc((100% - 54px) / ${i}); box-sizing: border-box;">
                  ${G}
                </td>
              `}),A+=`
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 9.5px; width: 54px; max-width: 54px; box-sizing: border-box;">
                  <div style="font-size: 10.5px; font-weight: 900; color: #0f172a;">${I(k.num)}</div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 0.5px;">${I(k.start)}-${I(k.end)}</div>
                </td>
                ${W}
              </tr>
            `});const P=l.length>1?` — CZĘŚĆ ${d+1}/${l.length} (Sal: ${i})`:` (Sal: ${i})`;o+=`
            <div class="sheet-page" style="page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
              <!-- Page Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 12.5px; font-weight: 950; color: #0f172a; letter-spacing: -0.01em;">
                    📅 ${I(Y[r].toUpperCase())} — ${I(n.name.toUpperCase())}${I(P)}
                  </div>
                  <div style="font-size: 9px; color: #475569; font-weight: bold; margin-top: 1px;">
                    ${I(x.school.name)} • ROK SZKOLNY ${I(x.yearLabel)} • ${L==="etap1"?"PLAN BAZOWY KLAS (ETAP 1)":"PLAN PRZYDZIAŁU SAL (ETAP 2)"}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8px; color: #64748b; font-family: monospace; font-weight: bold; line-height: 1.2;">
                  SalePlan Pro · Razem sal: ${Fe.length}<br>
                  ${new Date().toLocaleDateString("pl-PL")} ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>

              <!-- Matrix Table -->
              <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <!-- Floor level headers row -->
                  <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 9px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Godz
                    </th>
                    ${p.map(k=>`
                      <th colspan="${k.span}" style="border: 1px solid #94a3b8; padding: 2.5px 2px; text-align: center; font-size: 9px; font-weight: bold; background-color: #f8fafc; color: #334155; box-sizing: border-box;">
                        📍 ${I(ye(k.name,k.buildingName))}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Segment level headers row -->
                  <tr style="background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 7.5px; font-weight: 500; background-color: #f8fafc; color: #64748b; width: 54px; max-width: 54px; box-sizing: border-box;">
                      -
                    </th>
                    ${u.map(k=>`
                      <th colspan="${k.span}" style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        🧩 ${I(k.name)}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Room level headers row -->
                  <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 9px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Nr
                    </th>
                    ${a.map(k=>{const R=k.room.sub||"sala ogólna";return`
                        <th style="border: 1px solid #94a3b8; padding: ${m}; text-align: center; font-size: 9.5px; font-weight: 950; color: #020617; width: calc((100% - 54px) / ${i}); box-sizing: border-box;">
                          <span style="font-family: monospace; font-size: ${z}; display: block;">🚪 ${I(k.room.num)}</span>
                          ${h?`<span style="font-size: ${v}; color: #475569; font-weight: 500; display: block; margin-top: 0.5px; text-transform: lowercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(${I(R)})</span>`:""}
                        </th>
                      `}).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${A}
                </tbody>
              </table>
            </div>
          `})})}),`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1120, initial-scale=0.8, shrink-to-fit=no">
        <title>Płachta Gabinetów - SalePlan Pro</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 16px;
            background-color: #f1f5f9;
            color: #0f172a;
            width: 100%;
          }
          .no-print-bar {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            max-width: 100%;
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .btn-print:hover {
            background-color: #1d4ed8;
          }
          .btn-close {
            background-color: #f8fafc;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
          }
          
          .content-container {
            width: 100%;
            max-width: 100%;
          }
          
          @page {
            size: landscape;
            margin: 4mm 6mm;
          }
          
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .sheet-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            td, th {
              border: 1px solid #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">🖨️ PODGLĄD WYDRUKU PŁACHTY GABINETÓW (A4 POZIOMO)</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Automatycznie dopasowano do szerokości arkusza A4 bez ucinania</span>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj teraz (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="content-container">
          ${o}
        </div>

        <script>
          window.addEventListener('DOMContentLoaded', () => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        <\/script>
      </body>
      </html>
    `},Ce=()=>{try{const t=At(),c=window.open("","_blank","noopener");c?(c.document.write(t),c.document.close()):Ee(!0)}catch(t){console.error(t),Ee(!0)}},Pt=()=>{const t=x.dyzury.miejsca,c=x.dyzury.przerwy,s=Math.min(1,Math.max(.45,8/Math.max(t.length,1)));let o="";return[0,1,2,3,4].forEach(r=>{let n="";c.forEach(l=>{let a="";t.forEach(d=>{const i=`${d.id}|${r}|${l.num}`,p=x.dyzury.harmonogram[i],u=p!=null&&p.teacherAbbr?x.teachers.find(g=>g.abbr===p.teacherAbbr):null;let m="-";p!=null&&p.teacherAbbr&&(m=`
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${I(p.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${u?I(`${u.first} ${u.last}`):""}">
                ${u?`${I(u.first.slice(0,1))}. ${I(u.last)}`:"Dyżur"}
              </div>
            `),a+=`
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${m}
            </td>
          `}),n+=`
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${I(l.name||`Przerwa ${l.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${I(l.start)} - ${I(l.end)}</div>
            </td>
            ${a}
          </tr>
        `}),o+=`
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${I(Y[r])} — HARMONOGRAM DYŻURÓW</span>
            <span style="font-size: 8.5px; font-family: monospace; font-weight: bold; opacity: 0.8; text-transform: uppercase;">PODZIAŁ NA REJONY / MIEJSCA DYŻUROWAŃ</span>
          </div>

          ${t.length===0?`
            <p style="font-size: 11px; color: #64748b; font-style: italic; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; background: #fafafa;">Brak zdefiniowanych miejsc dyżurowania.</p>
          `:`
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; color: #334155; width: 140px;">PRZERWA / GODZINA</th>
                  ${t.map(l=>`
                    <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 900; color: #1e293b; background-color: #f8fafc;">
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${I(l.name)}</div>
                      ${l.floor?`<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${I(l.floor)}</div>`:""}
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${n}
              </tbody>
            </table>
          `}
        </div>
      `}),`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Plan i Harmonogram Dyżurów — SalePlan Pro</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print-bar {
            background-color: #fff;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 24px;
            display: flex;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .btn-close {
            background-color: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
            color: #1e293b;
          }
          .btn-print {
            background-color: #059669;
            color: #fff;
            border: 1px solid #059669;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.15s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .btn-print:hover {
            background-color: #047857;
            border-color: #047857;
          }
          .header {
            background-color: #fff;
            border-bottom: 2px solid #0f172a;
            padding: 24px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.01em;
            color: #0f172a;
          }
          .header-title p {
            margin: 4px 0 0 0;
            font-size: 11.5px;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-info {
            font-size: 9px;
            font-weight: bold;
            text-align: right;
            line-height: 1.5;
            color: #64748b;
            text-transform: uppercase;
          }
          .content {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #fff !important;
            }
            .header {
              padding: 12px 0 20px 0 !important;
              margin-bottom: 16px !important;
              border-bottom: 2px solid #000 !important;
            }
            .content {
              padding: 0 !important;
              max-width: 100% !important;
            }
            td, th {
              border: 1px solid #000 !important;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD HARMONOGRAMU DYŻURÓW</span>
            <span style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Układ poziomy (A4 landscape) został automatycznie zoptymalizowany pod drukarkę</span>
          </div>
          
          <div style="display: flex; align-items: center; gap: 16px; margin-left: auto; margin-right: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <label style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; white-space: nowrap;">Skala wydruku (Zoom):</label>
              <select id="scale-selector" onchange="adjustScale(this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #1e293b; background: white; cursor: pointer;">
                <option value="1.0" ${s>=.95?"selected":""}>Auto (100%)</option>
                <option value="0.95" ${s>=.9&&s<.95?"selected":""}>95%</option>
                <option value="0.90" ${s>=.85&&s<.9?"selected":""}>90%</option>
                <option value="0.85" ${s>=.8&&s<.85?"selected":""}>85% (Kompaktowa)</option>
                <option value="0.80" ${s>=.75&&s<.8?"selected":""}>80%</option>
                <option value="0.75" ${s>=.7&&s<.75?"selected":""}>75%</option>
                <option value="0.70" ${s>=.65&&s<.7?"selected":""}>70%</option>
                <option value="0.65" ${s>=.6&&s<.65?"selected":""}>65%</option>
                <option value="0.60" ${s>=.55&&s<.6?"selected":""}>60% (Gęsta)</option>
                <option value="0.55" ${s>=.5&&s<.55?"selected":""}>55%</option>
                <option value="0.50" ${s>=.45&&s<.5?"selected":""}>50%</option>
                <option value="0.45" ${s>=.4&&s<.45?"selected":""}>45%</option>
                <option value="0.40" ${s<.4?"selected":""}>40% (Bardzo gęsta)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn-close" onclick="window.close()">Zamknij okno</button>
            <button class="btn-print" onclick="window.print()">
              🖨️ Drukuj (Ctrl+P)
            </button>
          </div>
        </div>

        <div class="header">
          <div class="header-title">
            <h1>PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH</h1>
            <p>${I(x.school.name)} — Rok szkolny ${I(x.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            MODUŁ DYŻURÓW SZKOLNYCH<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString("pl-PL")} o ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div class="content">
          ${o}
        </div>

        <script>
          function adjustScale(scaleValue) {
            const content = document.querySelector('.content');
            const header = document.querySelector('.header');
            if (content) {
              content.style.zoom = scaleValue;
              content.style.webkitZoom = scaleValue;
            }
            if (header) {
              header.style.zoom = scaleValue;
              header.style.webkitZoom = scaleValue;
            }
          }

          // Initial scale application
          window.addEventListener('DOMContentLoaded', () => {
            const initialScale = document.getElementById('scale-selector')?.value || '1.0';
            adjustScale(initialScale);
            
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.print();
              });
            });
          });
        <\/script>
      </body>
      </html>
    `},Ct=()=>{try{const t=Pt(),c=window.open("","_blank","noopener");c?(c.document.write(t),c.document.close()):we(!0)}catch(t){console.error(t),we(!0)}},Se=N.useMemo(()=>q==="all"?b.classes:b.classes.filter(t=>t.id===q),[b.classes,q]),De=N.useMemo(()=>U==="all"?b.teachers:b.teachers.filter(t=>t.id===U),[b.teachers,U]),Fe=N.useMemo(()=>B==="all"?b.rooms:b.rooms.filter(t=>t.id===B),[b.rooms,B]),oe=N.useMemo(()=>{const t=Dt(x.floors),c=B==="all"?t:t.filter(a=>{const d=(a.room.num||"").toLowerCase().trim(),i=b.rooms.find(p=>p.name.toLowerCase().trim()===d);return i&&i.id===B}),s=[],o=[],r=[],n=new Map(b.rooms.map(a=>[a.name.toLowerCase().trim(),a]));c.forEach(a=>{const d=(a.room.num||"").toLowerCase().trim(),i=n.get(d),p=x.buildings[a.floor.buildingIdx],u=(i==null?void 0:i.type)==="indywidualne",m=(i==null?void 0:i.type)==="sport"||(p==null?void 0:p.multi)===!0;u?o.push(a):m?r.push(a):s.push(a)});const l=(a,d)=>{const i=a.room.num||"",p=d.room.num||"";return i.localeCompare(p,void 0,{numeric:!0,sensitivity:"base"})};return s.sort(l),o.sort(l),r.sort(l),{main:s,individual:o,sport:r}},[x.floors,x.buildings,b.rooms,B]),St=N.useMemo(()=>{const t=[],c=new Set;return x.floors.forEach((s,o)=>{const r=x.buildings[s.buildingIdx],n=(r==null?void 0:r.name)||`Budynek ${s.buildingIdx+1}`,l=ye(s.name||`Piętro ${o+1}`,n),a=`f_${o}`;c.has(a)||(c.add(a),t.push({id:a,name:`${n} - ${l}`,buildingName:n}))}),t},[x.floors,x.buildings]),je=N.useMemo(()=>{if(ke==="floors"){const t=[...oe.main,...oe.individual,...oe.sport],c=ve==="all"?t:t.filter(o=>`f_${o.floorIdx}`===ve),s=new Map;return c.forEach(o=>{const r=`f_${o.floorIdx}`,n=x.buildings[o.floor.buildingIdx],l=(n==null?void 0:n.name)||`Budynek ${o.floor.buildingIdx+1}`,a=ye(o.floor.name||`Piętro ${o.floorIdx+1}`,l),d=`${l} — ${a}`;s.has(r)||s.set(r,{id:r,name:d,icon:"📍",floorIdx:o.floorIdx,cols:[]}),s.get(r).cols.push(o)}),Array.from(s.values()).sort((o,r)=>o.floorIdx-r.floorIdx).filter(o=>o.cols.length>0)}return[{id:"main",name:"Budynek Główny",icon:"🏢",cols:oe.main},{id:"individual",name:"Nauczanie Indywidualne",icon:"🗣️",cols:oe.individual},{id:"sport",name:"Sale Sportowe",icon:"🏆",cols:oe.sport}].filter(t=>t.cols.length>0)},[ke,ve,oe,x.floors,x.buildings]);if(Ne){const t=be==="all"?[0,1,2,3,4]:[be],c=ue==="all"?je:je.filter(s=>s.id===ue);return e.jsxs("div",{id:"rooms-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @media print {
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: 100% !important;
              overflow: visible !important;
              position: static !important;
            }
            body {
              background-color: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #rooms-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .rooms-sheet-card {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: none !important;
              box-shadow: none !important;
              margin: 0 0 20px 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              table-layout: fixed !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              box-sizing: border-box !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${le};
              margin: 6mm 8mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-amber-400",children:e.jsx(F,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Studio Wydruku Płachty Sal"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Płachta Obłożenia Gabinetów • Układ A4 ",le==="landscape"?"Poziomy":"Pionowy"]})]})]}),e.jsxs("div",{className:"flex items-center gap-2.5 flex-wrap",children:[e.jsxs("div",{className:"flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700",children:[e.jsx("button",{onClick:()=>Ve("landscape"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${le==="landscape"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"}),e.jsx("button",{onClick:()=>Ve("portrait"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${le==="portrait"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Układ tabel:"}),e.jsxs("select",{value:ke,onChange:s=>ft(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"floors",className:"bg-slate-800 text-white",children:"Podział wg Kondygnacji (Zalecany)"}),e.jsx("option",{value:"cols",className:"bg-slate-800 text-white",children:"Wg Kategorii / Budynków"})]})]}),ke==="floors"&&e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Piętro:"}),e.jsxs("select",{value:ve,onChange:s=>gt(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kondygnacje"}),St.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Sal / strona:"}),e.jsxs("select",{value:pe,onChange:s=>jt(parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:8,className:"bg-slate-800 text-white",children:"8 sal (Duża czytelność)"}),e.jsx("option",{value:10,className:"bg-slate-800 text-white",children:"10 sal (Zalecane A4)"}),e.jsx("option",{value:12,className:"bg-slate-800 text-white",children:"12 sal (Standard)"}),e.jsx("option",{value:15,className:"bg-slate-800 text-white",children:"15 sal (Kompakt)"}),e.jsx("option",{value:0,className:"bg-slate-800 text-white",children:"Wszystkie w 1 tabeli"})]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Dzień:"}),e.jsxs("select",{value:be,onChange:s=>yt(s.target.value==="all"?"all":parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie dni (Pn-Pt)"}),Y.map((s,o)=>e.jsx("option",{value:o,className:"bg-slate-800 text-white",children:s},o))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Budynek:"}),e.jsxs("select",{value:ue,onChange:s=>wt(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kategorie"}),je.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("button",{onClick:Ce,className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer",title:"Otwórz czysty HTML w nowej karcie",children:[e.jsx(Et,{size:14})," W osobnym oknie"]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer",children:[e.jsx(F,{size:15})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>Ee(!1),className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer",children:"Zamknij"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8",children:t.map(s=>e.jsx("div",{className:"space-y-6",children:c.map(o=>{const r=rt(o.cols,pe>0?pe:o.cols.length);return r.map((n,l)=>{const a=n.length,d=Be(n,x.buildings),i=He(n),p=r.length>1?` — Część ${l+1}/${r.length} (Sal: ${a})`:` (Sal: ${a})`;return e.jsxs("div",{className:"rooms-sheet-card bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md transition",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-base md:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2",children:e.jsxs("span",{children:["📅 ",Y[s].toUpperCase()," — ",o.name.toUpperCase(),p]})}),e.jsxs("p",{className:"text-[10.5px] text-slate-600 font-bold uppercase mt-0.5",children:[x.school.name," • Rok szkolny ",x.yearLabel," • ",L==="etap1"?"Plan Bazowy Klas (Etap 1)":"Plan Przydziału Sal (Etap 2)"]})]}),e.jsxs("div",{className:"text-right text-[9px] font-mono text-slate-400 font-bold uppercase leading-tight",children:["SalePlan Pro • Sal w szkole: ",Fe.length,e.jsx("br",{}),"Wydrukowano: ",new Date().toLocaleDateString("pl-PL")]})]}),e.jsx("div",{className:"w-full overflow-hidden",children:e.jsxs("table",{className:"w-full text-xs text-left border-collapse table-fixed bg-white",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Godz"}),d.map((u,m)=>e.jsxs("th",{colSpan:u.span,className:"border border-slate-300 p-1.5 text-center text-[9.5px] bg-slate-50 font-bold text-slate-700",children:["📍 ",ye(u.name,u.buildingName)]},m))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1 text-center text-[8px] bg-slate-50 font-medium text-slate-400",children:"-"}),i.map((u,m)=>e.jsxs("th",{colSpan:u.span,className:"border border-slate-300 p-1 text-center text-[8.5px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",u.name]},m))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Nr"}),n.map((u,m)=>e.jsxs("th",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 text-center",children:[e.jsxs("span",{className:"font-mono text-[10.5px] block text-slate-950 font-black",children:["🚪 ",u.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-full mx-auto mt-0.5",children:["(",u.room.sub||"sala ogólna",")"]})]},m))]})]}),e.jsx("tbody",{children:te.map((u,m)=>e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 font-mono text-center bg-slate-50/60",children:[e.jsx("span",{className:"font-black text-slate-900 text-[11px] block",children:u.num}),e.jsxs("span",{className:"block text-[7.5px] text-slate-500 leading-none mt-0.5 font-medium",children:[u.start,"-",u.end]})]}),n.map((g,j)=>{const y=Ke(g,s,u.num,m);return e.jsx("td",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 align-middle text-center bg-white min-h-[44px]",children:y.length>0?e.jsx("div",{className:"space-y-1",children:y.map((w,f)=>e.jsxs("div",{className:"leading-tight flex flex-col items-center justify-center text-center py-0.5",title:`${w.displayText} (${w.subject})`,children:[e.jsx("span",{className:"font-black text-slate-950 text-[10.5px]",children:w.className}),w.groupShort&&e.jsx("span",{className:"text-indigo-700 text-[8.5px] font-bold",children:w.groupShort}),e.jsx("span",{className:"text-[9.5px] text-slate-800 font-extrabold truncate max-w-full",title:w.subject,children:w.subjectShort||w.subject}),w.teacherAbbr&&e.jsx("span",{className:"text-slate-600 text-[8.5px] font-mono font-bold",children:w.teacherAbbr})]},f))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},j)})]},u.num))})]})})]},`${s}-${o.id}-${l}`)})})},s))})]})}if(Le)return e.jsxs("div",{id:"weekly-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @media print {
            /* Ukrywamy nagłówek i stopkę systemową */
            header, footer, #restoring-pointer-blocker {
              display: none !important;
            }

            /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
            html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
              height: auto !important;
              width: auto !important;
              overflow: visible !important;
              position: static !important;
            }

            body {
              background-color: white !important;
              color: black !important;
            }

            #weekly-print-overlay {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-card {
              border: 1px solid #000 !important;
              margin-bottom: 25px !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-shadow: none !important;
              padding: 10px !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #000 !important;
              color: #000 !important;
              padding: 4px 6px !important;
              font-size: 10px !important;
            }
            th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: ${me};
              margin: 10mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-indigo-400",children:e.jsx(F,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Tryb przygotowania do druku"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Podgląd Tygodniowego Planu • ",$==="classes"?"Oddziały":"Nauczyciele"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>Ze("portrait"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${me==="portrait"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"}),e.jsx("button",{onClick:()=>Ze("landscape"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${me==="landscape"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"})]}),$==="classes"?e.jsxs("select",{value:q,onChange:t=>ee(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]}):e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("select",{value:U,onChange:t=>ae(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first]},t.id))]}),e.jsxs("label",{className:"flex items-center gap-1.5 text-xs text-slate-300 font-bold cursor-pointer select-none bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-600 transition",children:[e.jsx("input",{type:"checkbox",checked:ie,onChange:t=>qe(t.target.checked),className:"rounded text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5 cursor-pointer"}),e.jsx("span",{children:"Dyżury na przerwach"})]})]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(F,{size:13})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>_e(!1),className:"px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer",children:"Zamknij podgląd"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:$==="classes"?Se.map((t,c)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${c<Se.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN LEKCJI • KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[x.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",x.yearLabel," • ",L==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),Y.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:te.map((s,o)=>{const r=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{let l=[];return L==="etap1"?Object.entries(b.lessons).filter(([d])=>{const i=d.split("|");return i[0]===t.id&&parseInt(i[1],10)===n&&parseInt(i[2],10)===o}).forEach(([d,i])=>{var p,u;if(i){const m=b.assignments.find(g=>g.id===i.assignmentId);if(m){const g=((p=ne.get(m.subjectId))==null?void 0:p.name)||"Inny",j=m.groupId?(u=b.schoolGroups)==null?void 0:u.find(z=>z.id===m.groupId):null,y=j?`[${j.name}] ${g}`:g,w=m.teacherId?We.get(m.teacherId):null,f=m.roomId?ge.get(m.roomId):null;l.push({subject:y,teacherAbbr:w==null?void 0:w.abbr,roomName:f==null?void 0:f.name})}}}):(((Pe.classes[t.id]||{})[n]||{})[r]||[]).forEach(p=>{l.push({subject:p.subject,teacherAbbr:p.teacherAbbr,roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:l.length>0?e.jsx("div",{className:"space-y-1.5",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[a.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:a.teacherAbbr}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id)):De.map((t,c)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${c<De.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN NAUCZYCIELA • ",t.last.toUpperCase()," ",t.first.toUpperCase()," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[x.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",x.yearLabel," • ",L==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),Y.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsxs("tbody",{className:"divide-y divide-slate-200",children:[ie&&(()=>{var o;return(((o=x.dyzury)==null?void 0:o.przerwy)||[]).filter(r=>r.num===0).map(r=>[0,1,2,3,4].some(l=>se(t.abbr,l,r.num).length>0)?e.jsxs("tr",{className:"bg-amber-50/70 border-y border-amber-200/90 font-medium",children:[e.jsxs("td",{className:"border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60",children:[e.jsxs("span",{className:"font-extrabold text-amber-950 block",children:[r.start,"–",r.end]}),e.jsx("span",{className:"text-[8px] font-black uppercase text-amber-800 block",children:"Dyżur"})]}),[0,1,2,3,4].map(l=>{const a=se(t.abbr,l,r.num);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40",children:a.length>0?e.jsx("div",{className:"space-y-0.5",children:a.map((d,i)=>e.jsxs("div",{className:"text-[9.5px] leading-tight flex flex-col items-center justify-center text-center",children:[e.jsx("span",{className:"text-[7.5px] font-black text-amber-800 uppercase tracking-tight",children:"🛡️ Dyżur:"}),e.jsx("span",{className:"font-extrabold text-slate-950 text-[10px]",children:d.placeName}),d.floor&&e.jsxs("span",{className:"text-[8px] text-slate-600 font-medium",children:["(",d.floor,")"]})]},i))}):e.jsx("span",{className:"text-[8px] text-slate-300 font-mono",children:"-"})},l)})]},`break-pre-${r.num}`):null)})(),te.map((s,o)=>{var l;const r=Number(s.num),n=(((l=x.dyzury)==null?void 0:l.przerwy)||[]).filter(a=>a.num===0?!1:!!(a.num===r||a.num===o+1||s.end&&a.start&&s.end===a.start));return e.jsxs(bt.Fragment,{children:[e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8.5px] text-slate-500 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{const d=nt(t,a,Number(s.num),o);return e.jsx("td",{className:"border border-slate-300 p-2 align-middle text-center min-h-[52px] bg-white",children:d.length>0?e.jsx("div",{className:"space-y-1.5 py-0.5",children:d.map((i,p)=>e.jsxs("div",{className:"text-[10px] leading-tight flex flex-col items-center justify-center text-center",title:i.displayText,children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[11px]",children:i.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1 text-[9.5px] mt-0.5 font-bold text-slate-800",children:[e.jsx("span",{children:i.className}),i.groupShort&&e.jsxs("span",{className:"text-indigo-700 font-extrabold text-[8.5px]",children:["(",i.groupShort,")"]})]}),i.roomName&&e.jsxs("span",{className:"text-slate-600 text-[8.5px] font-semibold mt-0.5",children:["s. ",i.roomName]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},a)})]}),ie&&n.map(a=>[0,1,2,3,4].some(i=>se(t.abbr,i,a.num).length>0)?e.jsxs("tr",{className:"bg-amber-50/70 border-y border-amber-200/90 font-medium",children:[e.jsxs("td",{className:"border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60",children:[e.jsxs("span",{className:"font-extrabold text-amber-950 block",children:[a.start,"–",a.end]}),e.jsx("span",{className:"text-[8px] font-black uppercase text-amber-800 block",children:"Dyżur"})]}),[0,1,2,3,4].map(i=>{const p=se(t.abbr,i,a.num);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40",children:p.length>0?e.jsx("div",{className:"space-y-0.5",children:p.map((u,m)=>e.jsxs("div",{className:"text-[9.5px] leading-tight flex flex-col items-center justify-center text-center",children:[e.jsx("span",{className:"text-[7.5px] font-black text-amber-800 uppercase tracking-tight",children:"🛡️ Dyżur:"}),e.jsx("span",{className:"font-extrabold text-slate-950 text-[10px]",children:u.placeName}),u.floor&&e.jsxs("span",{className:"text-[8px] text-slate-600 font-medium",children:["(",u.floor,")"]})]},m))}):e.jsx("span",{className:"text-[8px] text-slate-300 font-mono",children:"-"})},i)})]},`break-${s.num}-${a.num}`):null)]},s.num)})]})]})]},t.id))})]});const ot=t=>!t||t.length===0?null:t.map((c,s)=>{var l;const o=c.className||((l=c.classes)==null?void 0:l.join(", "))||"",r=c.subject||"",n=c.note||"";return e.jsxs("div",{className:"text-[10px] font-semibold text-slate-700 leading-tight",children:["📚 ",e.jsx("span",{className:"font-extrabold text-slate-900",children:r})," (kl. ",o,", s. ",n,")"]},s)});return e.jsxs("div",{className:"flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible",children:[e.jsx("style",{children:`
        @media print {
          /* Ukrywamy nagłówek i stopkę systemową */
          header, footer, #restoring-pointer-blocker {
            display: none !important;
          }

          /* Resetujemy wysokości i paski przewijania kontenerów nadrzędnych */
          html, body, #root, [class*="h-screen"], [class*="overflow-hidden"] {
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            position: static !important;
          }

          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .print-card {
            border: 1px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 10px !important;
            margin-bottom: 25px !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 4px 6px !important;
            font-size: 10px !important;
            color: #000 !important;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h2, h3, h4 {
            color: #000 !important;
          }
        }
      `}),e.jsxs("div",{className:"no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto",children:[ht&&e.jsx("div",{className:"mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:"text-xl shrink-0",children:"⚠️"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase tracking-tight",children:"Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)"}),e.jsxs("p",{className:"text-[11px] text-amber-800 leading-normal font-semibold mt-1",children:["Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (",e.jsx("code",{className:"font-mono bg-amber-100 px-1 py-0.5 rounded",children:"window.print()"}),") oraz otwierania nowych okien z wnętrza takich ramek."]}),e.jsxs("div",{className:"bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"1"}),e.jsxs("span",{children:["Kliknij okrągłą ikonę ze strzałką ",e.jsx("strong",{className:"font-black",children:'"Otwórz w nowej karcie"'})," w prawym górnym rogu podglądu aplikacji."]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"2"}),e.jsxs("span",{children:["W nowym oknie przycisk ",e.jsx("strong",{className:"font-black",children:'"Drukuj teraz"'})," oraz ",e.jsx("strong",{className:"font-black",children:'"Podgląd płachty sal"'})," zadziałają natychmiast!"]})]})]})]})]})}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:e.jsx(F,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"Centrum Wydruków i Publikacji"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase mt-0.5",children:"Wygodne drukowanie planów lekcji i dyżurów"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[$==="rooms"&&e.jsxs("button",{onClick:Ce,className:"px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(F,{size:15,className:"animate-pulse"})," Podgląd płachty sal"]}),$==="duties"&&e.jsxs("button",{onClick:()=>ze(!0),className:"px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(F,{size:15,className:"animate-pulse"})," Podgląd dyżurów"]}),($==="classes"||$==="teachers")&&e.jsxs("button",{onClick:()=>_e(!0),className:"px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",title:"Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu",children:[e.jsx(Ue,{size:15})," Generuj Tygodniowy Plan"]}),e.jsxs("button",{onClick:It,className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer",children:[e.jsx(F,{size:15})," Drukuj teraz (Ctrl+P)"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Typ wydruku"}),e.jsxs("div",{className:"grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>O("classes"),className:`py-1.5 text-[11px] font-black rounded-md transition ${$==="classes"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Plan Klas"}),e.jsx("button",{onClick:()=>O("teachers"),className:`py-1.5 text-[11px] font-black rounded-md transition ${$==="teachers"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Nauczyciele"}),e.jsx("button",{onClick:()=>O("rooms"),className:`py-1.5 text-[11px] font-black rounded-md transition ${$==="rooms"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Gabinety"}),e.jsx("button",{onClick:()=>O("duties"),className:`py-1.5 text-[11px] font-black rounded-md transition ${$==="duties"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Dyżury"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Siatka Lekcji"}),e.jsxs("select",{value:L,onChange:t=>xe(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"etap1",children:"Etap 1: Plan Klas (Siatka bazowa)"}),e.jsx("option",{value:"etap2",children:"Etap 2: Plan Sal (Przydzielone gabinety)"})]})]}),$==="classes"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Klasę"}),e.jsxs("select",{value:q,onChange:t=>ee(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały (każdy na nowej stronie)"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]})]}),$==="teachers"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Nauczyciela"}),e.jsxs("select",{value:U,onChange:t=>ae(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele (każdy na nowej stronie)"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first," (",t.abbr,")"]},t.id))]})]}),e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase block",children:"Opcje planu"}),e.jsxs("label",{className:"h-[38px] px-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center gap-2 cursor-pointer transition select-none text-xs font-bold text-slate-700",children:[e.jsx("input",{type:"checkbox",checked:ie,onChange:t=>qe(t.target.checked),className:"rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"}),e.jsx("span",{children:"Pokaż dyżury międzylekcyjne"})]})]})]}),$==="rooms"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Gabinet"}),e.jsxs("select",{value:B,onChange:t=>re(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie sale/gabinety"}),b.rooms.map(t=>e.jsxs("option",{value:t.id,children:[t.name," (",t.desc||"sala ogólna",")"]},t.id))]})]}),$==="rooms"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:Ce,className:"w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid",children:[e.jsx(F,{size:15})," Podgląd wydruku płachty sal"]})]}),$==="duties"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:()=>ze(!0),className:"w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",children:[e.jsx(F,{size:15})," Podgląd wydruku dyżurów"]})]})]}),$==="teachers"&&e.jsx("div",{className:"mt-5 pt-5 border-t border-slate-100 space-y-4 text-left",children:e.jsxs("div",{className:"bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx("span",{className:"p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs",children:"📅"}),e.jsx("span",{className:"text-xs font-black uppercase text-indigo-900 tracking-wide",children:"Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Początek okresu (Pierwszy dzień lekcji)"}),e.jsx("input",{type:"date",value:Te,onChange:t=>Je(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Koniec okresu (Ostatni dzień lekcji)"}),e.jsx("input",{type:"date",value:Ge,onChange:t=>Qe(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Format tytułu wydarzenia w kalendarzu"}),e.jsxs("select",{value:Oe,onChange:t=>zt(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none",children:[e.jsx("option",{value:"[Przedmiot] - [Klasa] [Sala]",children:"[Przedmiot] - [Klasa] [Sala]"}),e.jsx("option",{value:"[Klasa] - [Przedmiot] [Sala]",children:"[Klasa] - [Przedmiot] [Sala]"}),e.jsx("option",{value:"[Przedmiot] ([Klasa]) (Sala: [Sala])",children:"[Przedmiot] ([Klasa]) ([Sala])"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",children:[e.jsxs("div",{className:"text-[10px] text-slate-500 leading-relaxed max-w-xl",children:["💡 ",e.jsx("strong",{children:"Wskazówka:"})," Kliknij przycisk ",e.jsx("span",{className:"bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]",children:"Pobierz kalendarz (.ics)"})," przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania."]}),e.jsxs("div",{className:"flex gap-2 flex-wrap w-full lg:w-auto",children:[U!=="all"&&e.jsxs("button",{onClick:()=>{const t=b.teachers.find(c=>c.id===U);t&&at(t)},className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(Ue,{size:13})," Pobierz dla ",(lt=b.teachers.find(t=>t.id===U))==null?void 0:lt.abbr]}),e.jsxs("button",{onClick:$t,className:"px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid",children:[e.jsx(Mt,{size:13})," Wspólny plik dla KADRY"]})]})]})]})})]}),e.jsxs("div",{className:"print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:[$==="classes"&&Se.map((t,c)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${c<Se.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI · KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[x.school.name," (",x.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",L==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),Y.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:te.map((s,o)=>{const r=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{let l=[];return L==="etap1"?Object.entries(b.lessons).filter(([d])=>{const i=d.split("|");return i[0]===t.id&&parseInt(i[1],10)===n&&parseInt(i[2],10)===o}).forEach(([d,i])=>{var p,u;if(i){const m=b.assignments.find(g=>g.id===i.assignmentId);if(m){const g=((p=ne.get(m.subjectId))==null?void 0:p.name)||"Inny",j=m.groupId?(u=b.schoolGroups)==null?void 0:u.find(z=>z.id===m.groupId):null,y=j?`[${j.name}] ${g}`:g,w=m.teacherId?We.get(m.teacherId):null,f=m.roomId?ge.get(m.roomId):null;l.push({subject:y,teacherAbbr:w==null?void 0:w.abbr,roomName:f==null?void 0:f.name})}}}):(((Pe.classes[t.id]||{})[n]||{})[r]||[]).forEach(p=>{l.push({subject:p.subject,teacherAbbr:p.teacherAbbr,roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:l.length>0?e.jsx("div",{className:"space-y-1",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[a.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:a.teacherAbbr}),a.roomName&&e.jsxs("span",{className:"bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded",children:["f. ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id)),$==="teachers"&&De.map((t,c)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${c<De.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI NAUCZYCIELA: ",t.last," ",t.first," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[x.school.name," (",x.yearLabel,")"]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("button",{onClick:()=>at(t),className:"no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid",title:"Pobierz plik kalendarza (.ics) dla tego nauczyciela",children:[e.jsx(Ue,{size:11})," Pobierz kalendarz (.ics)"]}),e.jsxs("div",{className:"text-right text-[9px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",L==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),Y.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsxs("tbody",{className:"divide-y divide-slate-200",children:[ie&&(()=>{var o;return(((o=x.dyzury)==null?void 0:o.przerwy)||[]).filter(r=>r.num===0).map(r=>[0,1,2,3,4].some(l=>se(t.abbr,l,r.num).length>0)?e.jsxs("tr",{className:"bg-amber-50/70 border-y border-amber-200/90 font-medium",children:[e.jsxs("td",{className:"border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60",children:[e.jsxs("span",{className:"font-extrabold text-amber-950 block",children:[r.start,"–",r.end]}),e.jsx("span",{className:"text-[8px] font-black uppercase text-amber-800 block",children:"Dyżur"})]}),[0,1,2,3,4].map(l=>{const a=se(t.abbr,l,r.num);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40",children:a.length>0?e.jsx("div",{className:"space-y-0.5",children:a.map((d,i)=>e.jsxs("div",{className:"text-[9.5px] leading-tight flex flex-col items-center justify-center text-center",children:[e.jsx("span",{className:"text-[7.5px] font-black text-amber-800 uppercase tracking-tight",children:"🛡️ Dyżur:"}),e.jsx("span",{className:"font-extrabold text-slate-950 text-[10px]",children:d.placeName}),d.floor&&e.jsxs("span",{className:"text-[8px] text-slate-600 font-medium",children:["(",d.floor,")"]})]},i))}):e.jsx("span",{className:"text-[8px] text-slate-300 font-mono",children:"-"})},l)})]},`break-pre-${r.num}`):null)})(),te.map((s,o)=>{var l;const r=Number(s.num),n=(((l=x.dyzury)==null?void 0:l.przerwy)||[]).filter(a=>a.num===0?!1:!!(a.num===r||a.num===o+1||s.end&&a.start&&s.end===a.start));return e.jsxs(bt.Fragment,{children:[e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{const d=nt(t,a,Number(s.num),o);return e.jsx("td",{className:"border border-slate-300 p-2 align-middle text-center min-h-[50px] bg-white",children:d.length>0?e.jsx("div",{className:"space-y-1.5 py-0.5",children:d.map((i,p)=>e.jsxs("div",{className:"text-[10px] leading-tight flex flex-col items-center justify-center text-center",title:i.displayText,children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[11px]",children:i.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1 text-[9.5px] mt-0.5 font-bold text-slate-800",children:[e.jsx("span",{children:i.className}),i.groupShort&&e.jsxs("span",{className:"text-indigo-700 font-extrabold text-[8.5px]",children:["(",i.groupShort,")"]})]}),i.roomName&&e.jsxs("span",{className:"text-slate-600 text-[8.5px] font-semibold mt-0.5",children:["s. ",i.roomName]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},a)})]}),ie&&n.map(a=>[0,1,2,3,4].some(i=>se(t.abbr,i,a.num).length>0)?e.jsxs("tr",{className:"bg-amber-50/70 border-y border-amber-200/90 font-medium",children:[e.jsxs("td",{className:"border border-slate-300 p-1.5 font-mono text-center text-[9.5px] bg-amber-100/60",children:[e.jsxs("span",{className:"font-extrabold text-amber-950 block",children:[a.start,"–",a.end]}),e.jsx("span",{className:"text-[8px] font-black uppercase text-amber-800 block",children:"Dyżur"})]}),[0,1,2,3,4].map(i=>{const p=se(t.abbr,i,a.num);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center bg-amber-50/40",children:p.length>0?e.jsx("div",{className:"space-y-0.5",children:p.map((u,m)=>e.jsxs("div",{className:"text-[9.5px] leading-tight flex flex-col items-center justify-center text-center",children:[e.jsx("span",{className:"text-[7.5px] font-black text-amber-800 uppercase tracking-tight",children:"🛡️ Dyżur:"}),e.jsx("span",{className:"font-extrabold text-slate-950 text-[10px]",children:u.placeName}),u.floor&&e.jsxs("span",{className:"text-[8px] text-slate-600 font-medium",children:["(",u.floor,")"]})]},m))}):e.jsx("span",{className:"text-[8px] text-slate-300 font-mono",children:"-"})},i)})]},`break-${s.num}-${a.num}`):null)]},s.num)})]})]})]},t.id)),$==="rooms"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[x.school.name," (",x.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",L==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase no-print",children:"Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty."}),e.jsxs("div",{className:"no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",children:[e.jsxs("div",{className:"space-y-1 text-left",children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase",children:"✨ Dedykowany Wydruk Płachty Dyrektorskiej"}),e.jsx("p",{className:"text-[11px] text-amber-700 leading-normal font-medium max-w-3xl",children:"Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki."})]}),e.jsxs("button",{onClick:Ce,className:"shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(F,{size:14,className:"animate-pulse"})," Podgląd i Druk Płachty (A4 Poziomo)"]})]}),Fe.length===0?e.jsx("p",{className:"text-xs text-slate-400 p-4 text-center",children:"Brak gabinetów do wyświetlenia w wybranym filtrze."}):e.jsx("div",{className:"space-y-12",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"page-break last:pb-0 pb-2",children:[e.jsxs("div",{className:"bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300",children:[e.jsxs("span",{className:"text-xs font-black uppercase tracking-wide",children:["📅 ",Y[t]," — PŁACHTA OBŁOŻENIA GABINETÓW"]}),e.jsx("span",{className:"text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500",children:"Podział na kategorie"})]}),e.jsx("div",{className:"space-y-6",children:je.map(c=>{const s=Be(c.cols,x.buildings),o=He(c.cols);return e.jsxs("div",{className:"border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 px-1",children:[e.jsx("span",{className:"text-sm",children:c.icon}),e.jsxs("h4",{className:"text-[11px] font-black text-slate-700 uppercase tracking-wider",children:[c.name," (",c.cols.length,")"]})]}),e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lekcja / Godz"}),s.map((r,n)=>e.jsxs("th",{colSpan:r.span,className:"border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700",children:["📍 ",ye(r.name,r.buildingName)]},n))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400",children:"-"}),o.map((r,n)=>e.jsxs("th",{colSpan:r.span,className:"border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",r.name]},n))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:"Godzina"}),c.cols.map((r,n)=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]",children:[e.jsxs("span",{className:"font-mono text-[11px] block text-slate-900",children:["🚪 ",r.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto",children:["(",r.room.sub||"sala ogólna",")"]})]},n))]})]}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:te.map((r,n)=>(String(r.num),e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[11px]",children:r.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[r.start,"-",r.end]})]}),c.cols.map((l,a)=>{const d=Ke(l,t,r.num,n);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center min-h-[50px] bg-white",children:d.length>0?e.jsx("div",{className:"space-y-1",children:d.map((i,p)=>e.jsxs("div",{className:"text-[10px] leading-tight flex flex-col items-center justify-center text-center py-0.5",title:`${i.displayText} (${i.subject})`,children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[10.5px]",children:i.className}),i.groupShort&&e.jsx("span",{className:"text-indigo-700 text-[8.5px] font-bold",children:i.groupShort}),e.jsx("span",{className:"text-[9.5px] text-slate-800 font-extrabold truncate max-w-full",title:i.subject,children:i.subjectShort||i.subject}),i.teacherAbbr&&e.jsx("span",{className:"text-slate-600 text-[8.5px] font-mono font-bold",children:i.teacherAbbr})]},p))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},r.num)))})]})})]},c.id)})})]},t))})]}),$==="duties"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[x.school.name," (",x.yearLabel,")"]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:"Generowane przez SalePlan Pro · Moduł Dyżurów"})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase",children:"Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych."}),e.jsx("div",{className:"space-y-8",children:[0,1,2,3,4].map(t=>{const c=x.dyzury.miejsca.some(s=>x.dyzury.przerwy.some(o=>{var n;const r=`${s.id}|${t}|${o.num}`;return!!((n=x.dyzury.harmonogram[r])!=null&&n.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5",children:["📅 ",Y[t]]}),c?x.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs border-collapse border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50",children:"Godzina / Przerwa"}),x.dyzury.miejsca.map(s=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:x.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-200 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2.5 font-mono text-[9px] text-left",children:[e.jsx("span",{className:"font-extrabold text-slate-800",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-0.5",children:["⏱️ ",s.start," - ",s.end]})]}),x.dyzury.miejsca.map(o=>{const r=`${o.id}|${t}|${s.num}`,n=x.dyzury.harmonogram[r],l=n!=null&&n.teacherAbbr?x.teachers.find(a=>a.abbr===n.teacherAbbr):null;return e.jsx("td",{className:"border border-slate-300 p-2 text-center align-middle",children:n!=null&&n.teacherAbbr?e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300",children:n.teacherAbbr}),e.jsx("span",{className:"block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500",children:l?`${l.first.slice(0,1)}. ${l.last}`:"Dyżur"})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},o.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})]}),Nt&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl",children:e.jsx(F,{size:22,className:"animate-pulse"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-emerald-400 block uppercase font-black tracking-wider",children:"Dynamiczny Podgląd i Weryfikacja • SchedData"}),e.jsx("h3",{className:"text-lg font-black uppercase text-white leading-tight",children:"Harmonogram Dyżurów Nauczycielskich"})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Dzień Tygodnia"}),e.jsxs("select",{value:Re,onChange:t=>{const c=t.target.value;vt(c==="all"?"all":parseInt(c,10))},className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie dni tygodnia"}),[0,1,2,3,4].map(t=>e.jsx("option",{value:t,children:Y[t]},t))]})]}),e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Skala (Zoom)"}),e.jsxs("select",{value:Me,onChange:t=>kt(parseFloat(t.target.value)),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"0.7",children:"70% (Gęsty/Kompaktowy)"}),e.jsx("option",{value:"0.8",children:"80%"}),e.jsx("option",{value:"0.85",children:"85%"}),e.jsx("option",{value:"0.9",children:"90%"}),e.jsx("option",{value:"1.0",children:"100% (Standardowy)"}),e.jsx("option",{value:"1.1",children:"110% (Powiększony)"})]})]}),e.jsx("div",{className:"flex items-end h-full",children:e.jsxs("button",{onClick:Ct,className:"h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",title:"Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF",children:[e.jsx(F,{size:15})," Drukuj / Generuj PDF"]})}),e.jsx("div",{className:"flex items-end h-full",children:e.jsx("button",{onClick:()=>ze(!1),className:"h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center",children:e.jsx(Rt,{size:18})})})]})]}),e.jsx("div",{className:"p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("div",{className:"mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8",style:{transform:`scale(${Me})`,transformOrigin:"top center",width:`${100/Me}%`,transition:"transform 0.15s ease-out, width 0.15s ease-out"},children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-xl font-black text-slate-950",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-extrabold uppercase",children:[x.school.name," • Rok szkolny ",x.yearLabel]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:"Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)"})]}),e.jsx("div",{className:"space-y-8 text-left",children:[0,1,2,3,4].filter(t=>Re==="all"||Re===t).map(t=>{const c=x.dyzury.miejsca.some(s=>x.dyzury.przerwy.some(o=>{var n;const r=`${s.id}|${t}|${o.num}`;return!!((n=x.dyzury.harmonogram[r])!=null&&n.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between",children:[e.jsxs("span",{children:["📅 ",Y[t]]}),e.jsxs("span",{className:"text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider",children:[x.dyzury.miejsca.length," Miejsc • ",x.dyzury.przerwy.length," Przerw"]})]}),c?x.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs",children:e.jsxs("table",{className:"w-full text-xs border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200",children:"Godzina / Przerwa"}),x.dyzury.miejsca.map(s=>e.jsxs("th",{className:"p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:x.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30",children:[e.jsx("span",{className:"font-extrabold text-slate-800 block text-xs",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-1",children:["⏱️ ",s.start," - ",s.end]})]}),x.dyzury.miejsca.map(o=>{var g;const r=`${o.id}|${t}|${s.num}`,n=x.dyzury.harmonogram[r],l=n!=null&&n.teacherAbbr?x.teachers.find(j=>j.abbr===n.teacherAbbr):null,a=(l==null?void 0:l.id)||(n==null?void 0:n.teacherAbbr)||"",d=a?((g=Pe.teachers[a])==null?void 0:g[t])||{}:{},i=a?d[String(s.num)]||[]:[],p=a?d[String(s.num+1)]||[]:[],u=a?Object.values(d).some(j=>Array.isArray(j)&&j.length>0):!1,m=x.dyzury.miejsca.filter(j=>j.id!==o.id).map(j=>{const y=`${j.id}|${t}|${s.num}`;return{placeName:j.name,entry:x.dyzury.harmonogram[y]}}).filter(j=>{var y;return((y=j.entry)==null?void 0:y.teacherAbbr)===(n==null?void 0:n.teacherAbbr)});return e.jsx("td",{className:"p-3 text-center align-middle border-r border-slate-200 last:border-r-0",children:n!=null&&n.teacherAbbr?e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-2",children:[e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block",children:n.teacherAbbr}),e.jsx("span",{className:"block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1",children:l?`${l.first} ${l.last}`:"Dyżur"})]}),e.jsxs("div",{className:"w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg",children:[e.jsx("div",{className:"text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1",children:"Weryfikacja lekcji:"}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Przed przerwą: "}),i.length>0?ot(i):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Po przerwie: "}),p.length>0?ot(p):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]})]}),(m.length>0||!u)&&e.jsxs("div",{className:"w-full space-y-1",children:[m.length>0&&e.jsxs("div",{className:"bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left",children:["🚨 Kolizja: Jednoczesny dyżur w rejonie: ",m.map(j=>j.placeName).join(", ")]}),!u&&e.jsx("div",{className:"bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left",children:"⚠️ Brak innych lekcji w tym dniu!"})]})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},o.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0",children:[e.jsx("span",{className:"text-xs text-slate-400 font-semibold uppercase",children:"Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim"}),e.jsx("button",{onClick:()=>ze(!1),className:"px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition",children:"Zamknij podgląd"})]})]})}),ut&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200",children:[e.jsx("h3",{className:"text-sm font-black text-slate-900 uppercase tracking-tight mb-2",children:"Pop-up zablokowany lub zakazany w bezpiecznym iFrame"}),e.jsx("p",{className:"text-xs text-slate-600 leading-relaxed mb-4",children:"Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:"}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"1"}),e.jsx("span",{children:"Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"2"}),e.jsx("span",{children:"Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"3"}),e.jsxs("span",{children:["Alternatywnie użyj przycisku ",e.jsx("strong",{className:"font-black text-slate-900",children:"Drukuj teraz"})," w menu głównym."]})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-3",children:[e.jsx("button",{onClick:()=>{we(!1),window.print()},className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer",children:"Drukuj stąd"}),e.jsx("button",{onClick:()=>we(!1),className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer",children:"Rozumiem"})]})]})})]})}export{Ut as default};
