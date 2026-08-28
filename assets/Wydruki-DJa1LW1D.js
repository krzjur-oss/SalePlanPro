import{r as w,j as e}from"./vendor-react-NQNxyWao.js";import{f as xt,a as Ae,c as mt}from"./index-CfV-19OF.js";import{P as D,a3 as bt,C as Se,g as ut,X as ht}from"./vendor-lucide-DHKfDJCj.js";import"./vendor-motion-FDUFV107.js";const M=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek"];function v(m){return String(m??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Ce(m,K){const k=[];let C=null;return m.forEach((A,ee)=>{const R=A.floor.buildingIdx,U=K[R],L=(U==null?void 0:U.name)||"",Z=A.floor.id,E=A.floor.name,_=`${R}|${Z}`;!C||C.key!==_?(C={startIdx:ee,span:1,key:_,name:E,buildingName:L},k.push(C)):C.span++}),k}function De(m){const K=[];let k=null;return m.forEach((C,A)=>{var E,_;const ee=C.floor.buildingIdx,R=C.floor.id,U=((E=C.seg)==null?void 0:E.id)||"default_seg",L=((_=C.seg)==null?void 0:_.name)||"Główny",Z=`${ee}|${R}|${U}`;!k||k.key!==Z?(k={startIdx:A,span:1,key:Z,name:L},K.push(k)):k.span++}),K}function kt({appState:m,schedData:K}){var Ve;const[k,C]=w.useState("classes"),[A,ee]=w.useState("etap1"),[R,U]=w.useState("all"),[L,Z]=w.useState("all"),[E,_]=w.useState("all"),[Je,ce]=w.useState(!1),[Qe,Le]=w.useState(!1),[ge,Ee]=w.useState(!1),[te,Me]=w.useState("landscape"),[pe,je]=w.useState(!1),[q,Re]=w.useState("landscape"),[se,Xe]=w.useState(12),[ae,et]=w.useState("all"),[re,tt]=w.useState("all"),[ft,gt]=w.useState(1),[st,xe]=w.useState(!1),[ye,at]=w.useState(1),[we,rt]=w.useState("all");w.useEffect(()=>{try{Le(window.self!==window.top)}catch{Le(!0)}},[]),w.useEffect(()=>{if(ge||pe){let t=document.querySelector('meta[name="viewport"]');const c=t?t.getAttribute("content"):"";t||(t=document.createElement("meta"),t.setAttribute("name","viewport"),document.head.appendChild(t));const s=pe?q:te,n=s==="landscape"?"1120":"794";t.setAttribute("content",`width=${n}, initial-scale=0.8, shrink-to-fit=no`);const i=document.createElement("style");return i.id="print-mobile-viewport-adjustments",i.innerHTML=`
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
      `,document.head.appendChild(i),()=>{t&&(c?t.setAttribute("content",c):t.removeAttribute("content"));const a=document.getElementById("print-mobile-viewport-adjustments");a&&a.remove()}}},[ge,te,pe,q]);const b=m.planLekcji,ne=w.useMemo(()=>{const t=m.yearLabel||"",c=t.match(/(\d{4})/);let s=new Date().getFullYear(),n=s+1;if(c){s=parseInt(c[1],10);const i=t.match(/\d{4}.*?(\d{4})/);i?n=parseInt(i[1],10):n=s+1}return{start:`${s}-09-01`,end:`${n}-06-25`}},[m.yearLabel]),[Ne,Te]=w.useState(ne.start),[ke,Ge]=w.useState(ne.end),[ve,nt]=w.useState("[Przedmiot] - [Klasa] [Sala]");w.useEffect(()=>{Te(ne.start),Ge(ne.end)},[ne]);const Oe=(t,c)=>{const s=new Date(t),n=c+1,i=s.getDay();let a=n-i;a<0&&(a+=7);const l=new Date(s);return l.setDate(s.getDate()+a),l},J=t=>{const c=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0"),i=String(t.getHours()).padStart(2,"0"),a=String(t.getMinutes()).padStart(2,"0"),l=String(t.getSeconds()).padStart(2,"0");return`${c}${s}${n}T${i}${a}${l}`},We=t=>{const c=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0");return`${c}${s}${n}T235959Z`},Q=t=>t?t.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n").trim():"",Ke=["MO","TU","WE","TH","FR"],Ue=t=>{const c=[];for(let s=0;s<5;s++)Y.forEach((n,i)=>{const a=String(n.num);let l=[];A==="etap1"?Object.entries(b.lessons).forEach(([r,d])=>{var u,j;const p=r.split("|"),x=p[0],o=parseInt(p[1],10),g=parseInt(p[2],10);if(o===s&&g===i){const f=b.assignments.find(h=>h.id===d.assignmentId);if(f&&f.teacherId===t.id){const h=((u=V.get(f.subjectId))==null?void 0:u.name)||"Inny",P=((j=oe.get(x))==null?void 0:j.name)||"Inna",y=f.roomId?le.get(f.roomId):null;l.push({subject:h,className:P,roomName:y==null?void 0:y.name})}}}):(((X.teachers[t.id]||{})[s]||{})[a]||[]).forEach(x=>{var o;l.push({subject:x.subject,className:x.className||((o=x.classes)==null?void 0:o.join("+"))||"Klasa",roomName:x.note})}),l.forEach(r=>{c.push({dayIdx:s,hourNum:n.num,start:n.start,end:n.end,subject:r.subject,className:r.className,roomName:r.roomName})})});return c},Ye=t=>{const c=Ue(t);if(c.length===0){alert(`Nauczyciel ${t.last} ${t.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);return}let s=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"];c.forEach(r=>{const d=Oe(Ne,r.dayIdx),[p,x]=r.start.split(":").map(Number),[o,g]=r.end.split(":").map(Number),u=new Date(d);u.setHours(p,x,0,0);const j=new Date(d);j.setHours(o,g,0,0);const f=ve.replace("[Przedmiot]",r.subject).replace("[Klasa]",r.className).replace("[Sala]",r.roomName?`s. ${r.roomName}`:"").replace(/\s+/g," ").trim(),h=`Lekcja: ${r.hourNum} (${r.start}-${r.end})\\nNauczyciel: ${t.last} ${t.first} (${t.abbr})\\nKlasa: ${r.className}\\n`+(r.roomName?`Sala: ${r.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",P=r.roomName?`Sala ${r.roomName}`:"",y=`asg-${t.id}-${r.dayIdx}-${r.hourNum}-${r.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}@saleplan.pro`,S=new Date(ke);s.push("BEGIN:VEVENT"),s.push(`UID:${y}`),s.push(`DTSTAMP:${J(new Date)}Z`),s.push(`DTSTART:${J(u)}`),s.push(`DTEND:${J(j)}`),s.push(`RRULE:FREQ=WEEKLY;UNTIL=${We(S)};BYDAY=${Ke[r.dayIdx]}`),s.push(`SUMMARY:${Q(f)}`),s.push(`LOCATION:${Q(P)}`),s.push(`DESCRIPTION:${Q(h)}`),s.push("END:VEVENT")}),s.push("END:VCALENDAR");const n=s.join(`\r
`),i=new Blob([n],{type:"text/calendar;charset=utf-8"}),a=URL.createObjectURL(i),l=document.createElement("a");l.href=a,l.download=`plan_${t.last}_${t.first}.ics`,document.body.appendChild(l),l.click(),document.body.removeChild(l),URL.revokeObjectURL(a)},ot=()=>{let t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"],c=0;if(b.teachers.forEach(l=>{Ue(l).forEach(d=>{c++;const p=Oe(Ne,d.dayIdx),[x,o]=d.start.split(":").map(Number),[g,u]=d.end.split(":").map(Number),j=new Date(p);j.setHours(x,o,0,0);const f=new Date(p);f.setHours(g,u,0,0);const h=`[${l.abbr}] `+ve.replace("[Przedmiot]",d.subject).replace("[Klasa]",d.className).replace("[Sala]",d.roomName?`s. ${d.roomName}`:"").replace(/\s+/g," ").trim(),P=`Nauczyciel: ${l.last} ${l.first} (${l.abbr})\\nLekcja: ${d.hourNum} (${d.start}-${d.end})\\nKlasa: ${d.className}\\n`+(d.roomName?`Sala: ${d.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",y=d.roomName?`Sala ${d.roomName}`:"",S=`asg-all-${l.id}-${d.dayIdx}-${d.hourNum}-${d.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}-${c}@saleplan.pro`,N=new Date(ke);t.push("BEGIN:VEVENT"),t.push(`UID:${S}`),t.push(`DTSTAMP:${J(new Date)}Z`),t.push(`DTSTART:${J(j)}`),t.push(`DTEND:${J(f)}`),t.push(`RRULE:FREQ=WEEKLY;UNTIL=${We(N)};BYDAY=${Ke[d.dayIdx]}`),t.push(`SUMMARY:${Q(h)}`),t.push(`LOCATION:${Q(y)}`),t.push(`DESCRIPTION:${Q(P)}`),t.push("END:VEVENT")})}),c===0){alert("Brak przypisanych lekcji w całym planie lekcji.");return}t.push("END:VCALENDAR");const s=t.join(`\r
`),n=new Blob([s],{type:"text/calendar;charset=utf-8"}),i=URL.createObjectURL(n),a=document.createElement("a");a.href=i,a.download="plan_wszyscy_nauczyciele.ics",document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(i)},oe=w.useMemo(()=>new Map(b.classes.map(t=>[t.id,t])),[b.classes]),ze=w.useMemo(()=>new Map(b.teachers.map(t=>[t.id,t])),[b.teachers]),V=w.useMemo(()=>new Map(b.subjects.map(t=>[t.id,t])),[b.subjects]),le=w.useMemo(()=>new Map(b.rooms.map(t=>[t.id,t])),[b.rooms]),He=w.useMemo(()=>new Map((b.schoolGroups||[]).map(t=>[t.id,t])),[b.schoolGroups]),Fe=(t,c)=>{if(c&&c.short&&String(c.short).trim())return String(c.short).trim();const s=b.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(s&&s.short&&s.short.trim())return s.short.trim();const n=m.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(n&&n.short&&n.short.trim())return n.short.trim();const i=(s==null?void 0:s.name)||(n==null?void 0:n.name)||t||"";if(!i)return"";if(i.length<=4)return i;const a=i.toLowerCase();return a.includes("angielsk")?"ang":a.includes("polsk")?"pol":a.includes("matemat")?"mat":a.includes("fizyk")?"fiz":a.includes("chem")?"chem":a.includes("biolog")?"biol":a.includes("geograf")?"geogr":a.includes("histor")?"hist":a.includes("informat")?"inf":a.includes("fizyczn")||a.includes("w-f")||a.includes("wf")?"WF":a.includes("relig")?"rel":a.includes("muzyk")?"muz":a.includes("plastyk")?"plas":a.includes("technik")?"tech":a.includes("niemieck")?"niem":a.includes("hiszpań")||a.includes("hiszpan")?"hiszp":a.includes("francusk")?"franc":a.includes("rosyjsk")?"ros":a.includes("etyk")?"etyka":a.includes("godzina wychowawcza")||a.includes("zajęcia z wychowawcą")?"GW":a.includes("edukacja wczesnoszkolna")?"EW":a.includes("edukacja dla bezpieczeństwa")?"EDB":a.includes("wiedza o społeczeństwie")?"WOS":a.includes("historia i teraźniejszość")?"HIT":i.slice(0,4)},Be=t=>{if(!t)return"";const c=String(t).trim();if(!c)return"";const s=(b.schoolGroups||[]).find(l=>l.id===c||l.name.toLowerCase()===c.toLowerCase()),n=s?s.name.trim():c;if(/^g\s*\d+$/i.test(n))return n.toUpperCase().replace(/\s+/,"");const i=n.match(/^grupa\s*(\d+|[a-zA-Z]+)/i);if(i)return`G${i[1].toUpperCase()}`;const a=n.match(/^gr\.?\s*(\d+|[a-zA-Z]+)/i);return a?`G${a[1].toUpperCase()}`:/^\d+$/.test(n)?`G${n}`:n.toLowerCase()==="chłopcy"||n.toLowerCase()==="chlopcy"?"chł":n.toLowerCase()==="dziewczęta"||n.toLowerCase()==="dziewczeta"?"dz":n},Y=w.useMemo(()=>b.hours&&b.hours.length>0?b.hours:[{num:1,start:"08:00",end:"08:45"},{num:2,start:"08:55",end:"09:40"},{num:3,start:"09:50",end:"10:35"},{num:4,start:"10:55",end:"11:40"},{num:5,start:"11:50",end:"12:35"}],[b.hours]),X=w.useMemo(()=>{const t=m.yearKey,c=K[t]||{},s={},n={},i={};return Object.entries(c).forEach(([a,l])=>{const r=parseInt(a,10);Object.entries(l).forEach(([d,p])=>{Object.entries(p).forEach(([x,o])=>{(Array.isArray(o)?o:[o]).forEach(u=>{var P,y,S;if(!u)return;const j=x.split("_"),f=j[j.length-1]||"";if(u.classes&&u.classes.length>0)u.classes.forEach(N=>{var $;const I=(($=b.classes.find(T=>T.name===N))==null?void 0:$.id)||N;s[I]||(s[I]={}),s[I][r]||(s[I][r]={}),s[I][r][d]||(s[I][r][d]=[]),s[I][r][d].push({...u,note:f})});else if(u.className){const N=((P=b.classes.find(I=>I.name===u.className))==null?void 0:P.id)||u.className;s[N]||(s[N]={}),s[N][r]||(s[N][r]={}),s[N][r][d]||(s[N][r][d]=[]),s[N][r][d].push({...u,note:f})}const h=u.teacherAbbr;if(h){const N=((y=b.teachers.find(I=>I.abbr===h))==null?void 0:y.id)||h;n[N]||(n[N]={}),n[N][r]||(n[N][r]={}),n[N][r][d]||(n[N][r][d]=[]),n[N][r][d].push({...u,note:f})}if(f){const N=((S=b.rooms.find(I=>I.name===f))==null?void 0:S.id)||f;i[N]||(i[N]={}),i[N][r]||(i[N][r]={}),i[N][r][d]||(i[N][r][d]=[]),i[N][r][d].push({...u,note:f})}})})})}),{classes:s,teachers:n,rooms:i}},[K,m.yearKey,b.classes,b.teachers,b.rooms]),lt=()=>{window.print()},Ze=(t,c)=>{if(!c||c<=0||t.length<=c)return[t];const s=[];for(let n=0;n<t.length;n+=c)s.push(t.slice(n,n+c));return s},$e=(t,c,s,n)=>{var a,l,r;const i=[];if(A==="etap1"){const d=new Set;Object.entries(b.lessons).forEach(([p,x])=>{var h,P;const o=p.split("|"),g=o[0],u=parseInt(o[1],10),j=parseInt(o[2],10),f=o[3]||null;if(u===c&&j===n){const y=b.assignments.find(S=>S.id===x.assignmentId);if(y){const S=b.rooms.find(I=>I.id===y.roomId);if(y.roomId===t.room.id||S&&S.name.toLowerCase().trim()===t.room.num.toLowerCase().trim()){const I=`${y.id}-${g}-${y.groupId||f||""}`;if(d.has(I))return;d.add(I);const $=V.get(y.subjectId)||b.subjects.find(B=>B.id===y.subjectId),T=($==null?void 0:$.name)||"Przedmiot",H=($==null?void 0:$.short)||Fe(y.subjectId,$);let O=((h=oe.get(g))==null?void 0:h.name)||"Klasa";if(y.linkedClassIds&&y.linkedClassIds.length>0){const B=y.linkedClassIds.map(pt=>{var qe;return(qe=oe.get(pt))==null?void 0:qe.name}).filter(Boolean);O=[O,...B].join("+")}const G=y.groupId||f,F=G?b.schoolGroups.find(B=>B.id===G)||He.get(G):null,z=F?F.name:G||void 0,W=Be(z),de=y.teacherId&&((P=ze.get(y.teacherId))==null?void 0:P.abbr)||"",fe=[O,H,W,de].filter(Boolean).join(" ");i.push({subject:T,subjectShort:H,className:O,groupName:z,groupShort:W,teacherAbbr:de,displayText:fe})}}}})}else{const d=mt(t),p=(r=(l=(a=K[m.yearKey])==null?void 0:a[c])==null?void 0:l[s])==null?void 0:r[d];(Array.isArray(p)?p:p?[p]:[]).forEach(o=>{var T,H,O,G,F;if(!o)return;const g=o.className||((T=o.classes)==null?void 0:T.join("+"))||"Klasa",u=((H=o._bridgeMeta)!=null&&H.subjectId?V.get(o._bridgeMeta.subjectId)||b.subjects.find(z=>{var W;return z.id===((W=o._bridgeMeta)==null?void 0:W.subjectId)}):null)||b.subjects.find(z=>z.name.toLowerCase().trim()===(o.subject||"").toLowerCase().trim()),j=o.subject||(u==null?void 0:u.name)||"Przedmiot",f=(u==null?void 0:u.short)||Fe(o.subject,u);let h=(O=o._bridgeMeta)==null?void 0:O.groupId;if(!h&&((G=o._bridgeMeta)!=null&&G.classId)&&((F=o._bridgeMeta)!=null&&F.subjectId)){const z=b.assignments.find(W=>{var de,Ie,fe,B;return W.classId===((de=o._bridgeMeta)==null?void 0:de.classId)&&W.subjectId===((Ie=o._bridgeMeta)==null?void 0:Ie.subjectId)&&(!((fe=o._bridgeMeta)!=null&&fe.teacherId)||W.teacherId===((B=o._bridgeMeta)==null?void 0:B.teacherId))});z!=null&&z.groupId&&(h=z.groupId)}if(!h&&o.note){const z=o.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2)\b/i);z&&(h=z[0])}if(!h){const z=g.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2)\b/i);z&&(h=z[0])}const P=h?b.schoolGroups.find(z=>z.id===h)||He.get(h):null,y=P?P.name:h||void 0,S=Be(y),N=o.teacherAbbr||"",$=[g,f,S,N].filter(Boolean).join(" ");i.push({subject:j,subjectShort:f,className:g,groupName:y,groupShort:S,teacherAbbr:N,displayText:$})})}return i},it=()=>{const t=ie,c=ae==="all"?[0,1,2,3,4]:[ae],s=re==="all"?t:t.filter(i=>i.id===re);let n="";return c.forEach(i=>{s.forEach(a=>{const l=Ze(a.cols,se>0?se:a.cols.length);l.forEach((r,d)=>{const p=r.length,x=Ce(r,m.buildings),o=De(r);let g="6px 4px",u="5px 3px",j="9.5px",f="9px",h="8px",P="11px",y="8px",S=!0;p>14?(g="3px 1px",u="3px 1px",j="7.5px",f="7.5px",h="7px",P="8.5px",y="6.5px",S=!1):p>10&&(g="4px 2px",u="4px 2px",j="8.5px",f="8.5px",h="8px",P="10px",y="7.5px");let N="";Y.forEach(($,T)=>{let H="";r.forEach(O=>{const G=$e(O,i,$.num,T);let F='<span style="color: #cbd5e1; font-weight: bold; font-family: monospace;">-</span>';G.length>0&&(F=G.map(z=>`
                  <div style="margin-bottom: 3px; line-height: 1.15; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;" title="${v(z.displayText)} (${v(z.subject)})">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 2px;">
                      <span style="background-color: #fef3c7; border: 1px solid #fde68a; color: #78350f; padding: 0.5px 3px; border-radius: 2px; font-weight: 900; font-size: ${j}; display: inline-block;">
                        ${v(z.className)}
                      </span>
                      ${z.groupShort?`
                        <span style="background-color: #ede9fe; border: 1px solid #ddd6fe; color: #5b21b6; padding: 0.5px 2.5px; border-radius: 2px; font-size: ${h}; font-weight: 900; display: inline-block;">
                          ${v(z.groupShort)}
                        </span>`:""}
                    </div>
                    <div style="color: #0f172a; font-weight: 800; font-size: ${f}; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${v(z.subjectShort||z.subject)}
                    </div>
                    ${z.teacherAbbr?`
                      <div>
                        <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 0.5px 3px; border-radius: 2px; font-size: ${h}; font-weight: 900; font-family: monospace; display: inline-block;">
                          ${v(z.teacherAbbr)}
                        </span>
                      </div>`:""}
                  </div>
                `).join("")),H+=`
                <td style="border: 1px solid #94a3b8; padding: ${u}; text-align: center; vertical-align: middle; background: #fff; width: calc((100% - 54px) / ${p}); box-sizing: border-box;">
                  ${F}
                </td>
              `}),N+=`
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 10px; width: 54px; max-width: 54px; box-sizing: border-box;">
                  <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v($.num)}</div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 0.5px;">${v($.start)}-${v($.end)}</div>
                </td>
                ${H}
              </tr>
            `});const I=l.length>1?` — CZĘŚĆ ${d+1}/${l.length} (Sal: ${p})`:` (Sal: ${p})`;n+=`
            <div class="sheet-page" style="page-break-after: always; break-after: page; margin-bottom: 24px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
              <!-- Page Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
                <div>
                  <div style="font-size: 13px; font-weight: 950; color: #0f172a; letter-spacing: -0.01em;">
                    📅 ${v(M[i].toUpperCase())} — ${v(a.name.toUpperCase())}${v(I)}
                  </div>
                  <div style="font-size: 9.5px; color: #475569; font-weight: bold; margin-top: 1px;">
                    ${v(m.school.name)} • ROK SZKOLNY ${v(m.yearLabel)} • ${A==="etap1"?"PLAN BAZOWY KLAS (ETAP 1)":"PLAN PRZYDZIAŁU SAL (ETAP 2)"}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8.5px; color: #64748b; font-family: monospace; font-weight: bold; line-height: 1.25;">
                  SalePlan Pro · Razem sal: ${Pe.length}<br>
                  ${new Date().toLocaleDateString("pl-PL")} ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>

              <!-- Matrix Table -->
              <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <!-- Floor level headers row -->
                  <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-size: 9.5px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Godz
                    </th>
                    ${x.map($=>`
                      <th colspan="${$.span}" style="border: 1px solid #94a3b8; padding: 3px; text-align: center; font-size: 9.5px; font-weight: bold; background-color: #f8fafc; color: #334155; box-sizing: border-box;">
                        📍 ${v(Ae($.name,$.buildingName))}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Segment level headers row -->
                  <tr style="background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8px; font-weight: 500; background-color: #f8fafc; color: #64748b; width: 54px; max-width: 54px; box-sizing: border-box;">
                      -
                    </th>
                    ${o.map($=>`
                      <th colspan="${$.span}" style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8.5px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        🧩 ${v($.name)}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Room level headers row -->
                  <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 4px 2px; text-align: center; font-size: 9.5px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Nr
                    </th>
                    ${r.map($=>{const T=$.room.sub||"sala ogólna";return`
                        <th style="border: 1px solid #94a3b8; padding: ${g}; text-align: center; font-size: 10px; font-weight: 950; color: #020617; width: calc((100% - 54px) / ${p}); box-sizing: border-box;">
                          <span style="font-family: monospace; font-size: ${P}; display: block;">🚪 ${v($.room.num)}</span>
                          ${S?`<span style="font-size: ${y}; color: #475569; font-weight: 500; display: block; margin-top: 0.5px; text-transform: lowercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(${v(T)})</span>`:""}
                        </th>
                      `}).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${N}
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
            margin: 6mm 8mm;
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
              margin: 0 0 20px 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
            }
            table {
              width: 100% !important;
              table-layout: fixed !important;
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
          ${n}
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
    `},me=()=>{try{const t=it(),c=window.open("","_blank","noopener");c?(c.document.write(t),c.document.close()):je(!0)}catch(t){console.error(t),je(!0)}},dt=()=>{const t=m.dyzury.miejsca,c=m.dyzury.przerwy,s=Math.min(1,Math.max(.45,8/Math.max(t.length,1)));let n="";return[0,1,2,3,4].forEach(i=>{let a="";c.forEach(l=>{let r="";t.forEach(d=>{const p=`${d.id}|${i}|${l.num}`,x=m.dyzury.harmonogram[p],o=x!=null&&x.teacherAbbr?m.teachers.find(u=>u.abbr===x.teacherAbbr):null;let g="-";x!=null&&x.teacherAbbr&&(g=`
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${v(x.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${o?v(`${o.first} ${o.last}`):""}">
                ${o?`${v(o.first.slice(0,1))}. ${v(o.last)}`:"Dyżur"}
              </div>
            `),r+=`
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${g}
            </td>
          `}),a+=`
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v(l.name||`Przerwa ${l.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${v(l.start)} - ${v(l.end)}</div>
            </td>
            ${r}
          </tr>
        `}),n+=`
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${v(M[i])} — HARMONOGRAM DYŻURÓW</span>
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
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${v(l.name)}</div>
                      ${l.floor?`<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${v(l.floor)}</div>`:""}
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${a}
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
            <p>${v(m.school.name)} — Rok szkolny ${v(m.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            MODUŁ DYŻURÓW SZKOLNYCH<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString("pl-PL")} o ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div class="content">
          ${n}
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
    `},ct=()=>{try{const t=dt(),c=window.open("","_blank","noopener");c?(c.document.write(t),c.document.close()):ce(!0)}catch(t){console.error(t),ce(!0)}},be=w.useMemo(()=>R==="all"?b.classes:b.classes.filter(t=>t.id===R),[b.classes,R]),ue=w.useMemo(()=>L==="all"?b.teachers:b.teachers.filter(t=>t.id===L),[b.teachers,L]),Pe=w.useMemo(()=>E==="all"?b.rooms:b.rooms.filter(t=>t.id===E),[b.rooms,E]),he=w.useMemo(()=>{const t=xt(m.floors),c=E==="all"?t:t.filter(r=>{const d=(r.room.num||"").toLowerCase().trim(),p=b.rooms.find(x=>x.name.toLowerCase().trim()===d);return p&&p.id===E}),s=[],n=[],i=[],a=new Map(b.rooms.map(r=>[r.name.toLowerCase().trim(),r]));c.forEach(r=>{const d=(r.room.num||"").toLowerCase().trim(),p=a.get(d),x=m.buildings[r.floor.buildingIdx],o=(p==null?void 0:p.type)==="indywidualne",g=(p==null?void 0:p.type)==="sport"||(x==null?void 0:x.multi)===!0;o?n.push(r):g?i.push(r):s.push(r)});const l=(r,d)=>{const p=r.room.num||"",x=d.room.num||"";return p.localeCompare(x,void 0,{numeric:!0,sensitivity:"base"})};return s.sort(l),n.sort(l),i.sort(l),{main:s,individual:n,sport:i}},[m.floors,m.buildings,b.rooms,E]),ie=w.useMemo(()=>[{id:"main",name:"Budynek Główny",icon:"🏢",cols:he.main},{id:"individual",name:"Nauczanie Indywidualne",icon:"🗣️",cols:he.individual},{id:"sport",name:"Sale Sportowe",icon:"🏆",cols:he.sport}].filter(t=>t.cols.length>0),[he]);if(pe){const t=ae==="all"?[0,1,2,3,4]:[ae],c=re==="all"?ie:ie.filter(s=>s.id===re);return e.jsxs("div",{id:"rooms-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
              size: ${q};
              margin: 6mm 8mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-amber-400",children:e.jsx(D,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Studio Wydruku Płachty Sal"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Płachta Obłożenia Gabinetów • Układ A4 ",q==="landscape"?"Poziomy":"Pionowy"]})]})]}),e.jsxs("div",{className:"flex items-center gap-2.5 flex-wrap",children:[e.jsxs("div",{className:"flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700",children:[e.jsx("button",{onClick:()=>Re("landscape"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${q==="landscape"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"}),e.jsx("button",{onClick:()=>Re("portrait"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${q==="portrait"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Sal / strona:"}),e.jsxs("select",{value:se,onChange:s=>Xe(parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:8,className:"bg-slate-800 text-white",children:"8 sal (Duża czytelność)"}),e.jsx("option",{value:10,className:"bg-slate-800 text-white",children:"10 sal (Zalecane A4)"}),e.jsx("option",{value:12,className:"bg-slate-800 text-white",children:"12 sal (Standard)"}),e.jsx("option",{value:15,className:"bg-slate-800 text-white",children:"15 sal (Kompakt)"}),e.jsx("option",{value:0,className:"bg-slate-800 text-white",children:"Wszystkie w 1 tabeli"})]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Dzień:"}),e.jsxs("select",{value:ae,onChange:s=>et(s.target.value==="all"?"all":parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie dni (Pn-Pt)"}),M.map((s,n)=>e.jsx("option",{value:n,className:"bg-slate-800 text-white",children:s},n))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Budynek:"}),e.jsxs("select",{value:re,onChange:s=>tt(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kategorie"}),ie.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("button",{onClick:me,className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer",title:"Otwórz czysty HTML w nowej karcie",children:[e.jsx(bt,{size:14})," W osobnym oknie"]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer",children:[e.jsx(D,{size:15})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>je(!1),className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer",children:"Zamknij"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8",children:t.map(s=>e.jsx("div",{className:"space-y-6",children:c.map(n=>{const i=Ze(n.cols,se>0?se:n.cols.length);return i.map((a,l)=>{const r=a.length,d=Ce(a,m.buildings),p=De(a),x=i.length>1?` — Część ${l+1}/${i.length} (Sal: ${r})`:` (Sal: ${r})`;return e.jsxs("div",{className:"rooms-sheet-card bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md transition",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-base md:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2",children:e.jsxs("span",{children:["📅 ",M[s].toUpperCase()," — ",n.name.toUpperCase(),x]})}),e.jsxs("p",{className:"text-[10.5px] text-slate-600 font-bold uppercase mt-0.5",children:[m.school.name," • Rok szkolny ",m.yearLabel," • ",A==="etap1"?"Plan Bazowy Klas (Etap 1)":"Plan Przydziału Sal (Etap 2)"]})]}),e.jsxs("div",{className:"text-right text-[9px] font-mono text-slate-400 font-bold uppercase leading-tight",children:["SalePlan Pro • Sal w szkole: ",Pe.length,e.jsx("br",{}),"Wydrukowano: ",new Date().toLocaleDateString("pl-PL")]})]}),e.jsx("div",{className:"w-full overflow-hidden",children:e.jsxs("table",{className:"w-full text-xs text-left border-collapse table-fixed bg-white",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Godz"}),d.map((o,g)=>e.jsxs("th",{colSpan:o.span,className:"border border-slate-300 p-1.5 text-center text-[9.5px] bg-slate-50 font-bold text-slate-700",children:["📍 ",Ae(o.name,o.buildingName)]},g))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1 text-center text-[8px] bg-slate-50 font-medium text-slate-400",children:"-"}),p.map((o,g)=>e.jsxs("th",{colSpan:o.span,className:"border border-slate-300 p-1 text-center text-[8.5px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",o.name]},g))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Nr"}),a.map((o,g)=>e.jsxs("th",{style:{width:`calc((100% - 52px) / ${r})`},className:"border border-slate-300 p-1.5 text-center",children:[e.jsxs("span",{className:"font-mono text-[10.5px] block text-slate-950 font-black",children:["🚪 ",o.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-full mx-auto mt-0.5",children:["(",o.room.sub||"sala ogólna",")"]})]},g))]})]}),e.jsx("tbody",{children:Y.map((o,g)=>e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 font-mono text-center bg-slate-50/60",children:[e.jsx("span",{className:"font-black text-slate-900 text-[11px] block",children:o.num}),e.jsxs("span",{className:"block text-[7.5px] text-slate-500 leading-none mt-0.5 font-medium",children:[o.start,"-",o.end]})]}),a.map((u,j)=>{const f=$e(u,s,o.num,g);return e.jsx("td",{style:{width:`calc((100% - 52px) / ${r})`},className:"border border-slate-300 p-1.5 align-middle text-center bg-white min-h-[44px]",children:f.length>0?e.jsx("div",{className:"space-y-1.5",children:f.map((h,P)=>e.jsxs("div",{className:"leading-tight flex flex-col items-center justify-center gap-0.5",title:`${h.displayText} (${h.subject})`,children:[e.jsxs("div",{className:"flex items-center justify-center gap-1",children:[e.jsx("span",{className:"font-black text-slate-950 text-[10px] bg-amber-100/90 border border-amber-300/90 rounded px-1.5 py-0.5 inline-block",children:h.className}),h.groupShort&&e.jsx("span",{className:"bg-purple-100 text-purple-900 border border-purple-200 px-1 py-0.2 rounded text-[8px] font-black inline-block",children:h.groupShort})]}),e.jsx("span",{className:"text-[9.5px] text-slate-900 font-extrabold truncate max-w-full",title:h.subject,children:h.subjectShort||h.subject}),h.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 text-slate-800 border border-slate-300 px-1 py-0.2 rounded text-[8px] font-mono font-bold inline-block",children:h.teacherAbbr})]},P))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},j)})]},o.num))})]})})]},`${s}-${n.id}-${l}`)})})},s))})]})}if(ge)return e.jsxs("div",{id:"weekly-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
              size: ${te};
              margin: 10mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-indigo-400",children:e.jsx(D,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Tryb przygotowania do druku"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Podgląd Tygodniowego Planu • ",k==="classes"?"Oddziały":"Nauczyciele"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>Me("portrait"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${te==="portrait"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"}),e.jsx("button",{onClick:()=>Me("landscape"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${te==="landscape"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"})]}),k==="classes"?e.jsxs("select",{value:R,onChange:t=>U(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]}):e.jsxs("select",{value:L,onChange:t=>Z(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first]},t.id))]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(D,{size:13})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>Ee(!1),className:"px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer",children:"Zamknij podgląd"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:k==="classes"?be.map((t,c)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${c<be.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN LEKCJI • KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:Y.map((s,n)=>{const i=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{var r;let l=[];if(A==="etap1"){const d=`${t.id}|${a}|${n}`,p=b.lessons[d];if(p){const x=b.assignments.find(o=>o.id===p.assignmentId);if(x){const o=((r=V.get(x.subjectId))==null?void 0:r.name)||"Inny",g=x.teacherId?ze.get(x.teacherId):null,u=x.roomId?le.get(x.roomId):null;l.push({subject:o,teacherAbbr:g==null?void 0:g.abbr,roomName:u==null?void 0:u.name})}}}else(((X.classes[t.id]||{})[a]||{})[i]||[]).forEach(o=>{l.push({subject:o.subject,teacherAbbr:o.teacherAbbr,roomName:o.note})});return e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:l.length>0?e.jsx("div",{className:"space-y-1.5",children:l.map((d,p)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:d.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[d.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:d.teacherAbbr}),d.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",d.roomName]})]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},a)})]},s.num)})})]})]},t.id)):ue.map((t,c)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${c<ue.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN NAUCZYCIELA • ",t.last.toUpperCase()," ",t.first.toUpperCase()," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:Y.map((s,n)=>{const i=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-200 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{let l=[];return A==="etap1"?Object.entries(b.lessons).forEach(([r,d])=>{var u,j;const p=r.split("|"),x=p[0],o=parseInt(p[1],10),g=parseInt(p[2],10);if(o===a&&g===n){const f=b.assignments.find(h=>h.id===d.assignmentId);if(f&&f.teacherId===t.id){const h=((u=V.get(f.subjectId))==null?void 0:u.name)||"Inny",P=((j=oe.get(x))==null?void 0:j.name)||"Inna",y=f.roomId?le.get(f.roomId):null;l.push({subject:h,className:P,roomName:y==null?void 0:y.name})}}}):(((X.teachers[t.id]||{})[a]||{})[i]||[]).forEach(x=>{var o;l.push({subject:x.subject,className:x.className||((o=x.classes)==null?void 0:o.join("+"))||"Klasa",roomName:x.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:l.length>0?e.jsx("div",{className:"space-y-1.5",children:l.map((r,d)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:r.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:r.className}),r.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",r.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},a)})]},s.num)})})]})]},t.id))})]});const _e=t=>!t||t.length===0?null:t.map((c,s)=>{var l;const n=c.className||((l=c.classes)==null?void 0:l.join(", "))||"",i=c.subject||"",a=c.note||"";return e.jsxs("div",{className:"text-[10px] font-semibold text-slate-700 leading-tight",children:["📚 ",e.jsx("span",{className:"font-extrabold text-slate-900",children:i})," (kl. ",n,", s. ",a,")"]},s)});return e.jsxs("div",{className:"flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto",children:[Qe&&e.jsx("div",{className:"mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:"text-xl shrink-0",children:"⚠️"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase tracking-tight",children:"Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)"}),e.jsxs("p",{className:"text-[11px] text-amber-800 leading-normal font-semibold mt-1",children:["Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (",e.jsx("code",{className:"font-mono bg-amber-100 px-1 py-0.5 rounded",children:"window.print()"}),") oraz otwierania nowych okien z wnętrza takich ramek."]}),e.jsxs("div",{className:"bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"1"}),e.jsxs("span",{children:["Kliknij okrągłą ikonę ze strzałką ",e.jsx("strong",{className:"font-black",children:'"Otwórz w nowej karcie"'})," w prawym górnym rogu podglądu aplikacji."]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"2"}),e.jsxs("span",{children:["W nowym oknie przycisk ",e.jsx("strong",{className:"font-black",children:'"Drukuj teraz"'})," oraz ",e.jsx("strong",{className:"font-black",children:'"Podgląd płachty sal"'})," zadziałają natychmiast!"]})]})]})]})]})}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:e.jsx(D,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"Centrum Wydruków i Publikacji"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase mt-0.5",children:"Wygodne drukowanie planów lekcji i dyżurów"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[k==="rooms"&&e.jsxs("button",{onClick:me,className:"px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(D,{size:15,className:"animate-pulse"})," Podgląd płachty sal"]}),k==="duties"&&e.jsxs("button",{onClick:()=>xe(!0),className:"px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(D,{size:15,className:"animate-pulse"})," Podgląd dyżurów"]}),(k==="classes"||k==="teachers")&&e.jsxs("button",{onClick:()=>Ee(!0),className:"px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",title:"Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu",children:[e.jsx(Se,{size:15})," Generuj Tygodniowy Plan"]}),e.jsxs("button",{onClick:lt,className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer",children:[e.jsx(D,{size:15})," Drukuj teraz (Ctrl+P)"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Typ wydruku"}),e.jsxs("div",{className:"grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>C("classes"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="classes"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Plan Klas"}),e.jsx("button",{onClick:()=>C("teachers"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="teachers"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Nauczyciele"}),e.jsx("button",{onClick:()=>C("rooms"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="rooms"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Gabinety"}),e.jsx("button",{onClick:()=>C("duties"),className:`py-1.5 text-[11px] font-black rounded-md transition ${k==="duties"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Dyżury"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Siatka Lekcji"}),e.jsxs("select",{value:A,onChange:t=>ee(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"etap1",children:"Etap 1: Plan Klas (Siatka bazowa)"}),e.jsx("option",{value:"etap2",children:"Etap 2: Plan Sal (Przydzielone gabinety)"})]})]}),k==="classes"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Klasę"}),e.jsxs("select",{value:R,onChange:t=>U(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały (każdy na nowej stronie)"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]})]}),k==="teachers"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Nauczyciela"}),e.jsxs("select",{value:L,onChange:t=>Z(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele (każdy na nowej stronie)"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first," (",t.abbr,")"]},t.id))]})]}),k==="rooms"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Gabinet"}),e.jsxs("select",{value:E,onChange:t=>_(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie sale/gabinety"}),b.rooms.map(t=>e.jsxs("option",{value:t.id,children:[t.name," (",t.desc||"sala ogólna",")"]},t.id))]})]}),k==="rooms"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:me,className:"w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid",children:[e.jsx(D,{size:15})," Podgląd wydruku płachty sal"]})]}),k==="duties"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:()=>xe(!0),className:"w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",children:[e.jsx(D,{size:15})," Podgląd wydruku dyżurów"]})]})]}),k==="teachers"&&e.jsx("div",{className:"mt-5 pt-5 border-t border-slate-100 space-y-4 text-left",children:e.jsxs("div",{className:"bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx("span",{className:"p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs",children:"📅"}),e.jsx("span",{className:"text-xs font-black uppercase text-indigo-900 tracking-wide",children:"Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Początek okresu (Pierwszy dzień lekcji)"}),e.jsx("input",{type:"date",value:Ne,onChange:t=>Te(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Koniec okresu (Ostatni dzień lekcji)"}),e.jsx("input",{type:"date",value:ke,onChange:t=>Ge(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Format tytułu wydarzenia w kalendarzu"}),e.jsxs("select",{value:ve,onChange:t=>nt(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none",children:[e.jsx("option",{value:"[Przedmiot] - [Klasa] [Sala]",children:"[Przedmiot] - [Klasa] [Sala]"}),e.jsx("option",{value:"[Klasa] - [Przedmiot] [Sala]",children:"[Klasa] - [Przedmiot] [Sala]"}),e.jsx("option",{value:"[Przedmiot] ([Klasa]) (Sala: [Sala])",children:"[Przedmiot] ([Klasa]) ([Sala])"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",children:[e.jsxs("div",{className:"text-[10px] text-slate-500 leading-relaxed max-w-xl",children:["💡 ",e.jsx("strong",{children:"Wskazówka:"})," Kliknij przycisk ",e.jsx("span",{className:"bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]",children:"Pobierz kalendarz (.ics)"})," przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania."]}),e.jsxs("div",{className:"flex gap-2 flex-wrap w-full lg:w-auto",children:[L!=="all"&&e.jsxs("button",{onClick:()=>{const t=b.teachers.find(c=>c.id===L);t&&Ye(t)},className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(Se,{size:13})," Pobierz dla ",(Ve=b.teachers.find(t=>t.id===L))==null?void 0:Ve.abbr]}),e.jsxs("button",{onClick:ot,className:"px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid",children:[e.jsx(ut,{size:13})," Wspólny plik dla KADRY"]})]})]})]})})]}),e.jsxs("div",{className:"print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:[k==="classes"&&be.map((t,c)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${c<be.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI · KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:Y.map((s,n)=>{const i=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{var r;let l=[];if(A==="etap1"){const d=`${t.id}|${a}|${n}`,p=b.lessons[d];if(p){const x=b.assignments.find(o=>o.id===p.assignmentId);if(x){const o=((r=V.get(x.subjectId))==null?void 0:r.name)||"Inny",g=x.teacherId?ze.get(x.teacherId):null,u=x.roomId?le.get(x.roomId):null;l.push({subject:o,teacherAbbr:g==null?void 0:g.abbr,roomName:u==null?void 0:u.name})}}}else(((X.classes[t.id]||{})[a]||{})[i]||[]).forEach(o=>{l.push({subject:o.subject,teacherAbbr:o.teacherAbbr,roomName:o.note})});return e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:l.length>0?e.jsx("div",{className:"space-y-1",children:l.map((d,p)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:d.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[d.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:d.teacherAbbr}),d.roomName&&e.jsxs("span",{className:"bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded",children:["f. ",d.roomName]})]})]},p))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},s.num)})})]})]},t.id)),k==="teachers"&&ue.map((t,c)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${c<ue.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI NAUCZYCIELA: ",t.last," ",t.first," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("button",{onClick:()=>Ye(t),className:"no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid",title:"Pobierz plik kalendarza (.ics) dla tego nauczyciela",children:[e.jsx(Se,{size:11})," Pobierz kalendarz (.ics)"]}),e.jsxs("div",{className:"text-right text-[9px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:Y.map((s,n)=>{const i=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(a=>{let l=[];return A==="etap1"?Object.entries(b.lessons).forEach(([r,d])=>{var u,j;const p=r.split("|"),x=p[0],o=parseInt(p[1],10),g=parseInt(p[2],10);if(o===a&&g===n){const f=b.assignments.find(h=>h.id===d.assignmentId);if(f&&f.teacherId===t.id){const h=((u=V.get(f.subjectId))==null?void 0:u.name)||"Inny",P=((j=oe.get(x))==null?void 0:j.name)||"Inna",y=f.roomId?le.get(f.roomId):null;l.push({subject:h,className:P,roomName:y==null?void 0:y.name})}}}):(((X.teachers[t.id]||{})[a]||{})[i]||[]).forEach(x=>{var o;l.push({subject:x.subject,className:x.className||((o=x.classes)==null?void 0:o.join("+"))||"Klasa",roomName:x.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:l.length>0?e.jsx("div",{className:"space-y-1",children:l.map((r,d)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:r.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:r.className}),r.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1.5 rounded",children:["s. ",r.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},s.num)})})]})]},t.id)),k==="rooms"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",A==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase no-print",children:"Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty."}),e.jsxs("div",{className:"no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",children:[e.jsxs("div",{className:"space-y-1 text-left",children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase",children:"✨ Dedykowany Wydruk Płachty Dyrektorskiej"}),e.jsx("p",{className:"text-[11px] text-amber-700 leading-normal font-medium max-w-3xl",children:"Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki."})]}),e.jsxs("button",{onClick:me,className:"shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(D,{size:14,className:"animate-pulse"})," Podgląd i Druk Płachty (A4 Poziomo)"]})]}),Pe.length===0?e.jsx("p",{className:"text-xs text-slate-400 p-4 text-center",children:"Brak gabinetów do wyświetlenia w wybranym filtrze."}):e.jsx("div",{className:"space-y-12",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"page-break last:pb-0 pb-2",children:[e.jsxs("div",{className:"bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300",children:[e.jsxs("span",{className:"text-xs font-black uppercase tracking-wide",children:["📅 ",M[t]," — PŁACHTA OBŁOŻENIA GABINETÓW"]}),e.jsx("span",{className:"text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500",children:"Podział na kategorie"})]}),e.jsx("div",{className:"space-y-6",children:ie.map(c=>{const s=Ce(c.cols,m.buildings),n=De(c.cols);return e.jsxs("div",{className:"border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 px-1",children:[e.jsx("span",{className:"text-sm",children:c.icon}),e.jsxs("h4",{className:"text-[11px] font-black text-slate-700 uppercase tracking-wider",children:[c.name," (",c.cols.length,")"]})]}),e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lekcja / Godz"}),s.map((i,a)=>e.jsxs("th",{colSpan:i.span,className:"border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700",children:["📍 ",Ae(i.name,i.buildingName)]},a))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400",children:"-"}),n.map((i,a)=>e.jsxs("th",{colSpan:i.span,className:"border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",i.name]},a))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:"Godzina"}),c.cols.map((i,a)=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]",children:[e.jsxs("span",{className:"font-mono text-[11px] block text-slate-900",children:["🚪 ",i.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto",children:["(",i.room.sub||"sala ogólna",")"]})]},a))]})]}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:Y.map((i,a)=>(String(i.num),e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[11px]",children:i.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[i.start,"-",i.end]})]}),c.cols.map((l,r)=>{const d=$e(l,t,i.num,a);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center min-h-[50px] bg-white",children:d.length>0?e.jsx("div",{className:"space-y-1.5",children:d.map((p,x)=>e.jsxs("div",{className:"text-[10px] leading-tight flex flex-col items-center justify-center gap-0.5",title:`${p.displayText} (${p.subject})`,children:[e.jsxs("div",{className:"flex items-center justify-center gap-1",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[10.5px] bg-amber-100/70 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block",children:p.className}),p.groupShort&&e.jsx("span",{className:"bg-purple-100 text-purple-900 border border-purple-200 px-1 py-0.2 rounded text-[8.5px] font-black inline-block",children:p.groupShort})]}),e.jsx("span",{className:"text-[9.5px] text-slate-800 font-extrabold truncate max-w-full",title:p.subject,children:p.subjectShort||p.subject}),p.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold inline-block",children:p.teacherAbbr})]},x))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},r)})]},i.num)))})]})})]},c.id)})})]},t))})]}),k==="duties"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:"Generowane przez SalePlan Pro · Moduł Dyżurów"})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase",children:"Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych."}),e.jsx("div",{className:"space-y-8",children:[0,1,2,3,4].map(t=>{const c=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(n=>{var a;const i=`${s.id}|${t}|${n.num}`;return!!((a=m.dyzury.harmonogram[i])!=null&&a.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5",children:["📅 ",M[t]]}),c?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs border-collapse border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-200 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2.5 font-mono text-[9px] text-left",children:[e.jsx("span",{className:"font-extrabold text-slate-800",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-0.5",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(n=>{const i=`${n.id}|${t}|${s.num}`,a=m.dyzury.harmonogram[i],l=a!=null&&a.teacherAbbr?m.teachers.find(r=>r.abbr===a.teacherAbbr):null;return e.jsx("td",{className:"border border-slate-300 p-2 text-center align-middle",children:a!=null&&a.teacherAbbr?e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300",children:a.teacherAbbr}),e.jsx("span",{className:"block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500",children:l?`${l.first.slice(0,1)}. ${l.last}`:"Dyżur"})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},n.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})]}),st&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl",children:e.jsx(D,{size:22,className:"animate-pulse"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-emerald-400 block uppercase font-black tracking-wider",children:"Dynamiczny Podgląd i Weryfikacja • SchedData"}),e.jsx("h3",{className:"text-lg font-black uppercase text-white leading-tight",children:"Harmonogram Dyżurów Nauczycielskich"})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Dzień Tygodnia"}),e.jsxs("select",{value:we,onChange:t=>{const c=t.target.value;rt(c==="all"?"all":parseInt(c,10))},className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie dni tygodnia"}),[0,1,2,3,4].map(t=>e.jsx("option",{value:t,children:M[t]},t))]})]}),e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Skala (Zoom)"}),e.jsxs("select",{value:ye,onChange:t=>at(parseFloat(t.target.value)),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"0.7",children:"70% (Gęsty/Kompaktowy)"}),e.jsx("option",{value:"0.8",children:"80%"}),e.jsx("option",{value:"0.85",children:"85%"}),e.jsx("option",{value:"0.9",children:"90%"}),e.jsx("option",{value:"1.0",children:"100% (Standardowy)"}),e.jsx("option",{value:"1.1",children:"110% (Powiększony)"})]})]}),e.jsx("div",{className:"flex items-end h-full",children:e.jsxs("button",{onClick:ct,className:"h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",title:"Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF",children:[e.jsx(D,{size:15})," Drukuj / Generuj PDF"]})}),e.jsx("div",{className:"flex items-end h-full",children:e.jsx("button",{onClick:()=>xe(!1),className:"h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center",children:e.jsx(ht,{size:18})})})]})]}),e.jsx("div",{className:"p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("div",{className:"mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8",style:{transform:`scale(${ye})`,transformOrigin:"top center",width:`${100/ye}%`,transition:"transform 0.15s ease-out, width 0.15s ease-out"},children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-xl font-black text-slate-950",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-extrabold uppercase",children:[m.school.name," • Rok szkolny ",m.yearLabel]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:"Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)"})]}),e.jsx("div",{className:"space-y-8 text-left",children:[0,1,2,3,4].filter(t=>we==="all"||we===t).map(t=>{const c=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(n=>{var a;const i=`${s.id}|${t}|${n.num}`;return!!((a=m.dyzury.harmonogram[i])!=null&&a.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between",children:[e.jsxs("span",{children:["📅 ",M[t]]}),e.jsxs("span",{className:"text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider",children:[m.dyzury.miejsca.length," Miejsc • ",m.dyzury.przerwy.length," Przerw"]})]}),c?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs",children:e.jsxs("table",{className:"w-full text-xs border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30",children:[e.jsx("span",{className:"font-extrabold text-slate-800 block text-xs",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-1",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(n=>{var u;const i=`${n.id}|${t}|${s.num}`,a=m.dyzury.harmonogram[i],l=a!=null&&a.teacherAbbr?m.teachers.find(j=>j.abbr===a.teacherAbbr):null,r=(l==null?void 0:l.id)||(a==null?void 0:a.teacherAbbr)||"",d=r?((u=X.teachers[r])==null?void 0:u[t])||{}:{},p=r?d[String(s.num)]||[]:[],x=r?d[String(s.num+1)]||[]:[],o=r?Object.values(d).some(j=>Array.isArray(j)&&j.length>0):!1,g=m.dyzury.miejsca.filter(j=>j.id!==n.id).map(j=>{const f=`${j.id}|${t}|${s.num}`;return{placeName:j.name,entry:m.dyzury.harmonogram[f]}}).filter(j=>{var f;return((f=j.entry)==null?void 0:f.teacherAbbr)===(a==null?void 0:a.teacherAbbr)});return e.jsx("td",{className:"p-3 text-center align-middle border-r border-slate-200 last:border-r-0",children:a!=null&&a.teacherAbbr?e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-2",children:[e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block",children:a.teacherAbbr}),e.jsx("span",{className:"block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1",children:l?`${l.first} ${l.last}`:"Dyżur"})]}),e.jsxs("div",{className:"w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg",children:[e.jsx("div",{className:"text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1",children:"Weryfikacja lekcji:"}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Przed przerwą: "}),p.length>0?_e(p):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Po przerwie: "}),x.length>0?_e(x):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]})]}),(g.length>0||!o)&&e.jsxs("div",{className:"w-full space-y-1",children:[g.length>0&&e.jsxs("div",{className:"bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left",children:["🚨 Kolizja: Jednoczesny dyżur w rejonie: ",g.map(j=>j.placeName).join(", ")]}),!o&&e.jsx("div",{className:"bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left",children:"⚠️ Brak innych lekcji w tym dniu!"})]})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},n.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0",children:[e.jsx("span",{className:"text-xs text-slate-400 font-semibold uppercase",children:"Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim"}),e.jsx("button",{onClick:()=>xe(!1),className:"px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition",children:"Zamknij podgląd"})]})]})}),Je&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200",children:[e.jsx("h3",{className:"text-sm font-black text-slate-900 uppercase tracking-tight mb-2",children:"Pop-up zablokowany lub zakazany w bezpiecznym iFrame"}),e.jsx("p",{className:"text-xs text-slate-600 leading-relaxed mb-4",children:"Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:"}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"1"}),e.jsx("span",{children:"Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"2"}),e.jsx("span",{children:"Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"3"}),e.jsxs("span",{children:["Alternatywnie użyj przycisku ",e.jsx("strong",{className:"font-black text-slate-900",children:"Drukuj teraz"})," w menu głównym."]})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-3",children:[e.jsx("button",{onClick:()=>{ce(!1),window.print()},className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer",children:"Drukuj stąd"}),e.jsx("button",{onClick:()=>ce(!1),className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer",children:"Rozumiem"})]})]})})]})}export{kt as default};
