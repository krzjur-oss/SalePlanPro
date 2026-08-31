import{r as w,j as e}from"./vendor-react-NQNxyWao.js";import{f as jt,a as ue,c as yt}from"./index-DmffzY0u.js";import{n as E,a6 as wt,C as Re,d as Nt,X as kt}from"./vendor-lucide-BzWLwViq.js";import"./vendor-motion-FDUFV107.js";const G=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek"];function z(m){return String(m??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Ge(m,W){const v=[];let L=null;return m.forEach((P,se)=>{const T=P.floor.buildingIdx,K=W[T],M=(K==null?void 0:K.name)||"",H=P.floor.id,R=P.floor.name,Z=`${T}|${H}`;!L||L.key!==Z?(L={startIdx:se,span:1,key:Z,name:R,buildingName:M},v.push(L)):L.span++}),v}function Te(m){const W=[];let v=null;return m.forEach((L,P)=>{var R,Z;const se=L.floor.buildingIdx,T=L.floor.id,K=((R=L.seg)==null?void 0:R.id)||"default_seg",M=((Z=L.seg)==null?void 0:Z.name)||"Główny",H=`${se}|${T}|${K}`;!v||v.key!==H?(v={startIdx:P,span:1,key:H,name:M},W.push(v)):v.span++}),W}function St({appState:m,schedData:W}){var tt;const[v,L]=w.useState("classes"),[P,se]=w.useState("etap1"),[T,K]=w.useState("all"),[M,H]=w.useState("all"),[R,Z]=w.useState("all"),[st,he]=w.useState(!1),[at,Oe]=w.useState(!1),[$e,We]=w.useState(!1),[ae,Ke]=w.useState("landscape"),[fe,Ie]=w.useState(!1),[J,Ue]=w.useState("landscape"),[ge,rt]=w.useState("floors"),[je,nt]=w.useState("all"),[re,ot]=w.useState(12),[ne,lt]=w.useState("all"),[oe,it]=w.useState("all"),[vt,zt]=w.useState(1),[dt,ye]=w.useState(!1),[Pe,ct]=w.useState(1),[Ae,pt]=w.useState("all");w.useEffect(()=>{try{Oe(window.self!==window.top)}catch{Oe(!0)}},[]),w.useEffect(()=>{if($e||fe){let t=document.querySelector('meta[name="viewport"]');const i=t?t.getAttribute("content"):"";t||(t=document.createElement("meta"),t.setAttribute("name","viewport"),document.head.appendChild(t));const s=fe?J:ae,o=s==="landscape"?"1120":"794";t.setAttribute("content",`width=${o}, initial-scale=0.8, shrink-to-fit=no`);const n=document.createElement("style");return n.id="print-mobile-viewport-adjustments",n.innerHTML=`
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
      `,document.head.appendChild(n),()=>{t&&(i?t.setAttribute("content",i):t.removeAttribute("content"));const r=document.getElementById("print-mobile-viewport-adjustments");r&&r.remove()}}},[$e,ae,fe,J]);const b=m.planLekcji,le=w.useMemo(()=>{const t=m.yearLabel||"",i=t.match(/(\d{4})/);let s=new Date().getFullYear(),o=s+1;if(i){s=parseInt(i[1],10);const n=t.match(/\d{4}.*?(\d{4})/);n?o=parseInt(n[1],10):o=s+1}return{start:`${s}-09-01`,end:`${o}-06-25`}},[m.yearLabel]),[Se,Ye]=w.useState(le.start),[Ce,Fe]=w.useState(le.end),[De,xt]=w.useState("[Przedmiot] - [Klasa] [Sala]");w.useEffect(()=>{Ye(le.start),Fe(le.end)},[le]);const Be=(t,i)=>{const s=new Date(t),o=i+1,n=s.getDay();let r=o-n;r<0&&(r+=7);const l=new Date(s);return l.setDate(s.getDate()+r),l},Q=t=>{const i=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0"),n=String(t.getHours()).padStart(2,"0"),r=String(t.getMinutes()).padStart(2,"0"),l=String(t.getSeconds()).padStart(2,"0");return`${i}${s}${o}T${n}${r}${l}`},He=t=>{const i=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0");return`${i}${s}${o}T235959Z`},X=t=>t?t.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n").trim():"",Ze=["MO","TU","WE","TH","FR"],_e=t=>{const i=[];for(let s=0;s<5;s++)U.forEach((o,n)=>{const r=String(o.num);let l=[];P==="etap1"?Object.entries(b.lessons).forEach(([a,d])=>{var h,g;const c=a.split("|"),p=c[0],u=parseInt(c[1],10),x=parseInt(c[2],10);if(u===s&&x===n){const f=b.assignments.find(j=>j.id===d.assignmentId);if(f&&f.teacherId===t.id){const j=((h=_.get(f.subjectId))==null?void 0:h.name)||"Inny",N=((g=ie.get(p))==null?void 0:g.name)||"Inna",k=f.roomId?de.get(f.roomId):null;l.push({subject:j,className:N,roomName:k==null?void 0:k.name})}}}):(((ee.teachers[t.id]||{})[s]||{})[r]||[]).forEach(p=>{var u;l.push({subject:p.subject,className:p.className||((u=p.classes)==null?void 0:u.join("+"))||"Klasa",roomName:p.note})}),l.forEach(a=>{i.push({dayIdx:s,hourNum:o.num,start:o.start,end:o.end,subject:a.subject,className:a.className,roomName:a.roomName})})});return i},Ve=t=>{const i=_e(t);if(i.length===0){alert(`Nauczyciel ${t.last} ${t.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);return}let s=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"];i.forEach(a=>{const d=Be(Se,a.dayIdx),[c,p]=a.start.split(":").map(Number),[u,x]=a.end.split(":").map(Number),h=new Date(d);h.setHours(c,p,0,0);const g=new Date(d);g.setHours(u,x,0,0);const f=De.replace("[Przedmiot]",a.subject).replace("[Klasa]",a.className).replace("[Sala]",a.roomName?`s. ${a.roomName}`:"").replace(/\s+/g," ").trim(),j=`Lekcja: ${a.hourNum} (${a.start}-${a.end})\\nNauczyciel: ${t.last} ${t.first} (${t.abbr})\\nKlasa: ${a.className}\\n`+(a.roomName?`Sala: ${a.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",N=a.roomName?`Sala ${a.roomName}`:"",k=`asg-${t.id}-${a.dayIdx}-${a.hourNum}-${a.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}@saleplan.pro`,$=new Date(Ce);s.push("BEGIN:VEVENT"),s.push(`UID:${k}`),s.push(`DTSTAMP:${Q(new Date)}Z`),s.push(`DTSTART:${Q(h)}`),s.push(`DTEND:${Q(g)}`),s.push(`RRULE:FREQ=WEEKLY;UNTIL=${He($)};BYDAY=${Ze[a.dayIdx]}`),s.push(`SUMMARY:${X(f)}`),s.push(`LOCATION:${X(N)}`),s.push(`DESCRIPTION:${X(j)}`),s.push("END:VEVENT")}),s.push("END:VCALENDAR");const o=s.join(`\r
`),n=new Blob([o],{type:"text/calendar;charset=utf-8"}),r=URL.createObjectURL(n),l=document.createElement("a");l.href=r,l.download=`plan_${t.last}_${t.first}.ics`,document.body.appendChild(l),l.click(),document.body.removeChild(l),URL.revokeObjectURL(r)},mt=()=>{let t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"],i=0;if(b.teachers.forEach(l=>{_e(l).forEach(d=>{i++;const c=Be(Se,d.dayIdx),[p,u]=d.start.split(":").map(Number),[x,h]=d.end.split(":").map(Number),g=new Date(c);g.setHours(p,u,0,0);const f=new Date(c);f.setHours(x,h,0,0);const j=`[${l.abbr}] `+De.replace("[Przedmiot]",d.subject).replace("[Klasa]",d.className).replace("[Sala]",d.roomName?`s. ${d.roomName}`:"").replace(/\s+/g," ").trim(),N=`Nauczyciel: ${l.last} ${l.first} (${l.abbr})\\nLekcja: ${d.hourNum} (${d.start}-${d.end})\\nKlasa: ${d.className}\\n`+(d.roomName?`Sala: ${d.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",k=d.roomName?`Sala ${d.roomName}`:"",$=`asg-all-${l.id}-${d.dayIdx}-${d.hourNum}-${d.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}-${i}@saleplan.pro`,y=new Date(Ce);t.push("BEGIN:VEVENT"),t.push(`UID:${$}`),t.push(`DTSTAMP:${Q(new Date)}Z`),t.push(`DTSTART:${Q(g)}`),t.push(`DTEND:${Q(f)}`),t.push(`RRULE:FREQ=WEEKLY;UNTIL=${He(y)};BYDAY=${Ze[d.dayIdx]}`),t.push(`SUMMARY:${X(j)}`),t.push(`LOCATION:${X(k)}`),t.push(`DESCRIPTION:${X(N)}`),t.push("END:VEVENT")})}),i===0){alert("Brak przypisanych lekcji w całym planie lekcji.");return}t.push("END:VCALENDAR");const s=t.join(`\r
`),o=new Blob([s],{type:"text/calendar;charset=utf-8"}),n=URL.createObjectURL(o),r=document.createElement("a");r.href=n,r.download="plan_wszyscy_nauczyciele.ics",document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)},ie=w.useMemo(()=>new Map(b.classes.map(t=>[t.id,t])),[b.classes]),Le=w.useMemo(()=>new Map(b.teachers.map(t=>[t.id,t])),[b.teachers]),_=w.useMemo(()=>new Map(b.subjects.map(t=>[t.id,t])),[b.subjects]),de=w.useMemo(()=>new Map(b.rooms.map(t=>[t.id,t])),[b.rooms]),qe=w.useMemo(()=>new Map((b.schoolGroups||[]).map(t=>[t.id,t])),[b.schoolGroups]),Je=(t,i)=>{if(i&&i.short&&String(i.short).trim())return String(i.short).trim();const s=b.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(s&&s.short&&s.short.trim())return s.short.trim();const o=m.subjects.find(l=>l.id===t||l.name.toLowerCase().trim()===String(t).toLowerCase().trim());if(o&&o.short&&o.short.trim())return o.short.trim();const n=(s==null?void 0:s.name)||(o==null?void 0:o.name)||t||"";if(!n)return"";if(n.length<=4)return n;const r=n.toLowerCase();return r.includes("angielsk")?"ang":r.includes("polsk")?"pol":r.includes("matemat")?"mat":r.includes("fizyk")?"fiz":r.includes("chem")?"chem":r.includes("biolog")?"biol":r.includes("geograf")?"geogr":r.includes("histor")?"hist":r.includes("informat")?"inf":r.includes("fizyczn")||r.includes("w-f")||r.includes("wf")?"WF":r.includes("relig")?"rel":r.includes("muzyk")?"muz":r.includes("plastyk")?"plas":r.includes("technik")?"tech":r.includes("niemieck")?"niem":r.includes("hiszpań")||r.includes("hiszpan")?"hiszp":r.includes("francusk")?"franc":r.includes("rosyjsk")?"ros":r.includes("etyk")?"etyka":r.includes("godzina wychowawcza")||r.includes("zajęcia z wychowawcą")?"GW":r.includes("edukacja wczesnoszkolna")?"EW":r.includes("edukacja dla bezpieczeństwa")?"EDB":r.includes("wiedza o społeczeństwie")?"WOS":r.includes("historia i teraźniejszość")?"HIT":n.slice(0,4)},Qe=(t,i)=>{if(!t)return"";const s=String(t).trim();if(!s)return"";const o=(b.schoolGroups||[]).find(d=>d.id===s||d.name.toLowerCase()===s.toLowerCase()),n=o?o.name.trim():s;if(/^g\s*\d+$/i.test(n))return n.toUpperCase().replace(/\s+/,"");const r=n.match(/^grupa\s*(\d+|[a-zA-Z]+)/i);if(r)return`G${r[1].toUpperCase()}`;const l=n.match(/^gr\.?\s*(\d+|[a-zA-Z]+)/i);if(l)return`G${l[1].toUpperCase()}`;if(/^\d+$/.test(n))return`G${n}`;if(/^1\/2$/i.test(n)||/^gr\.?\s*1\/2$/i.test(n))return"G1";if(/^2\/2$/i.test(n)||/^gr\.?\s*2\/2$/i.test(n))return"G2";if(n.toLowerCase()==="chłopcy"||n.toLowerCase()==="chlopcy")return"chł";if(n.toLowerCase()==="dziewczęta"||n.toLowerCase()==="dziewczeta")return"dz";const a=n.toLowerCase();if(a.includes("relig")||a.includes("mniejszoś")||a.includes("mniejszos")||a.includes("hiszpań")||a.includes("hiszpan")||a.includes("niemieck")||a.includes("angielsk")||a.includes("informat")||a.includes("etyk")||a.includes("fizyczn")||a.includes("wf"))return"";if(i){const d=i.toLowerCase();if(a.includes(d)||d.includes(a))return""}return n.length<=4&&!/^[A-Z0-9]{3,}$/.test(n)?n:""},U=w.useMemo(()=>b.hours&&b.hours.length>0?b.hours:[{num:1,start:"08:00",end:"08:45"},{num:2,start:"08:55",end:"09:40"},{num:3,start:"09:50",end:"10:35"},{num:4,start:"10:55",end:"11:40"},{num:5,start:"11:50",end:"12:35"}],[b.hours]),ee=w.useMemo(()=>{const t=m.yearKey,i=W[t]||{},s={},o={},n={};return Object.entries(i).forEach(([r,l])=>{const a=parseInt(r,10);Object.entries(l).forEach(([d,c])=>{Object.entries(c).forEach(([p,u])=>{(Array.isArray(u)?u:[u]).forEach(h=>{var N,k,$;if(!h)return;const g=p.split("_"),f=g[g.length-1]||"";if(h.classes&&h.classes.length>0)h.classes.forEach(y=>{var I;const A=((I=b.classes.find(C=>C.name===y))==null?void 0:I.id)||y;s[A]||(s[A]={}),s[A][a]||(s[A][a]={}),s[A][a][d]||(s[A][a][d]=[]),s[A][a][d].push({...h,note:f})});else if(h.className){const y=((N=b.classes.find(A=>A.name===h.className))==null?void 0:N.id)||h.className;s[y]||(s[y]={}),s[y][a]||(s[y][a]={}),s[y][a][d]||(s[y][a][d]=[]),s[y][a][d].push({...h,note:f})}const j=h.teacherAbbr;if(j){const y=((k=b.teachers.find(A=>A.abbr===j))==null?void 0:k.id)||j;o[y]||(o[y]={}),o[y][a]||(o[y][a]={}),o[y][a][d]||(o[y][a][d]=[]),o[y][a][d].push({...h,note:f})}if(f){const y=(($=b.rooms.find(A=>A.name===f))==null?void 0:$.id)||f;n[y]||(n[y]={}),n[y][a]||(n[y][a]={}),n[y][a][d]||(n[y][a][d]=[]),n[y][a][d].push({...h,note:f})}})})})}),{classes:s,teachers:o,rooms:n}},[W,m.yearKey,b.classes,b.teachers,b.rooms]),bt=()=>{window.print()},Xe=(t,i)=>{if(!i||i<=0||t.length<=i)return[t];const s=[];for(let o=0;o<t.length;o+=i)s.push(t.slice(o,o+i));return s},Ee=(t,i,s,o)=>{var l,a,d;const n=[];if(P==="etap1"){const c=new Set;Object.entries(b.lessons).forEach(([p,u])=>{var N,k;const x=p.split("|"),h=x[0],g=parseInt(x[1],10),f=parseInt(x[2],10),j=x[3]||null;if(g===i&&f===o){const $=b.assignments.find(y=>y.id===u.assignmentId);if($){const y=b.rooms.find(I=>I.id===$.roomId);if($.roomId===t.room.id||y&&y.name.toLowerCase().trim()===t.room.num.toLowerCase().trim()){const I=`${$.id}-${h}-${$.groupId||j||""}`;if(c.has(I))return;c.add(I);const C=_.get($.subjectId)||b.subjects.find(B=>B.id===$.subjectId),Y=(C==null?void 0:C.name)||"Przedmiot",te=(C==null?void 0:C.short)||Je($.subjectId,C);let O=((N=ie.get(h))==null?void 0:N.name)||"Klasa";if($.linkedClassIds&&$.linkedClassIds.length>0){const B=$.linkedClassIds.map(ze=>{var be;return(be=ie.get(ze))==null?void 0:be.name}).filter(Boolean);O=[O,...B].join("+")}const F=O.replace(/\s*\([^)]*\)/g,"").trim()||O,S=$.groupId||j,pe=S?b.schoolGroups.find(B=>B.id===S)||qe.get(S):null,xe=pe?pe.name:S||void 0,me=Qe(xe,te||Y),D=$.teacherId&&((k=Le.get($.teacherId))==null?void 0:k.abbr)||"",ve=[F,te,me,D].filter(Boolean).join(" ");n.push({subject:Y,subjectShort:te,className:F,groupName:xe,groupShort:me,teacherAbbr:D,displayText:ve})}}}})}else{const c=yt(t),p=(d=(a=(l=W[m.yearKey])==null?void 0:l[i])==null?void 0:a[s])==null?void 0:d[c];(Array.isArray(p)?p:p?[p]:[]).forEach(x=>{var F,S,pe,xe,me;if(!x)return;const h=x.className||((F=x.classes)==null?void 0:F.join("+"))||"Klasa";let g=h,f="";const j=h.match(/\(([^)]+)\)/);j&&(f=j[1].trim(),g=h.replace(/\s*\([^)]*\)/g,"").trim()||h);const N=((S=x._bridgeMeta)!=null&&S.subjectId?_.get(x._bridgeMeta.subjectId)||b.subjects.find(D=>{var q;return D.id===((q=x._bridgeMeta)==null?void 0:q.subjectId)}):null)||b.subjects.find(D=>D.name.toLowerCase().trim()===(x.subject||"").toLowerCase().trim()),k=x.subject||(N==null?void 0:N.name)||"Przedmiot",$=(N==null?void 0:N.short)||Je(x.subject,N);let y=(pe=x._bridgeMeta)==null?void 0:pe.groupId;if(!y&&((xe=x._bridgeMeta)!=null&&xe.classId)&&((me=x._bridgeMeta)!=null&&me.subjectId)){const D=b.assignments.find(q=>{var ve,B,ze,be;return q.classId===((ve=x._bridgeMeta)==null?void 0:ve.classId)&&q.subjectId===((B=x._bridgeMeta)==null?void 0:B.subjectId)&&(!((ze=x._bridgeMeta)!=null&&ze.teacherId)||q.teacherId===((be=x._bridgeMeta)==null?void 0:be.teacherId))});D!=null&&D.groupId&&(y=D.groupId)}if(!y&&f&&(y=f),!y&&x.note){const D=x.note.match(/\b(G\d+|gr\.?\s*\d+|grupa\s*\d+|1\/2|2\/2|chłopcy|dziewczęta)\b/i);D&&(y=D[0])}const A=y?b.schoolGroups.find(D=>D.id===y)||qe.get(y):null,I=A?A.name:y||void 0,C=Qe(I,$||k),Y=x.teacherAbbr||"",O=[g,$,C,Y].filter(Boolean).join(" ");n.push({subject:k,subjectShort:$,className:g,groupName:I,groupShort:C,teacherAbbr:Y,displayText:O})})}const r=new Set;return n.filter(c=>{const p=`${c.className}|${c.subjectShort}|${c.groupShort}|${c.teacherAbbr}`;return r.has(p)?!1:(r.add(p),!0)})},ut=()=>{const t=ce,i=ne==="all"?[0,1,2,3,4]:[ne],s=oe==="all"?t:t.filter(n=>n.id===oe);let o="";return i.forEach(n=>{s.forEach(r=>{const l=Xe(r.cols,re>0?re:r.cols.length);l.forEach((a,d)=>{const c=a.length,p=Ge(a,m.buildings),u=Te(a);let x="4px 3px",h="3px 2px",g="9px",f="8.5px",j="8px",N="10.5px",k="7.5px",$=!0;c>14?(x="2px 1px",h="2px 1px",g="7.5px",f="7.5px",j="7px",N="8px",k="6.5px",$=!1):c>10&&(x="3px 2px",h="2.5px 1.5px",g="8px",f="8px",j="7.5px",N="9.5px",k="7px");let y="";U.forEach((I,C)=>{let Y="";a.forEach(te=>{const O=Ee(te,n,I.num,C);let F='<span style="color: #cbd5e1; font-weight: bold; font-family: monospace;">-</span>';O.length>0&&(F=O.map(S=>`
                  <div style="margin-bottom: 2px; line-height: 1.1; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5px;" title="${z(S.displayText)} (${z(S.subject)})">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 2px;">
                      <span style="background-color: #fef3c7; border: 1px solid #fde68a; color: #78350f; padding: 0.5px 3px; border-radius: 2px; font-weight: 900; font-size: ${g}; display: inline-block;">
                        ${z(S.className)}
                      </span>
                      ${S.groupShort?`
                        <span style="background-color: #ede9fe; border: 1px solid #ddd6fe; color: #5b21b6; padding: 0.5px 2.5px; border-radius: 2px; font-size: ${j}; font-weight: 900; display: inline-block;">
                          ${z(S.groupShort)}
                        </span>`:""}
                    </div>
                    <div style="color: #0f172a; font-weight: 800; font-size: ${f}; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${z(S.subjectShort||S.subject)}
                    </div>
                    ${S.teacherAbbr?`
                      <div>
                        <span style="background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; padding: 0.5px 3px; border-radius: 2px; font-size: ${j}; font-weight: 900; font-family: monospace; display: inline-block;">
                          ${z(S.teacherAbbr)}
                        </span>
                      </div>`:""}
                  </div>
                `).join("")),Y+=`
                <td style="border: 1px solid #94a3b8; padding: ${h}; text-align: center; vertical-align: middle; background: #fff; width: calc((100% - 54px) / ${c}); box-sizing: border-box;">
                  ${F}
                </td>
              `}),y+=`
              <tr>
                <td style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 9.5px; width: 54px; max-width: 54px; box-sizing: border-box;">
                  <div style="font-size: 10.5px; font-weight: 900; color: #0f172a;">${z(I.num)}</div>
                  <div style="font-size: 7.5px; color: #64748b; margin-top: 0.5px;">${z(I.start)}-${z(I.end)}</div>
                </td>
                ${Y}
              </tr>
            `});const A=l.length>1?` — CZĘŚĆ ${d+1}/${l.length} (Sal: ${c})`:` (Sal: ${c})`;o+=`
            <div class="sheet-page" style="page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; background: white; padding: 10px 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box; width: 100%;">
              <!-- Page Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 12.5px; font-weight: 950; color: #0f172a; letter-spacing: -0.01em;">
                    📅 ${z(G[n].toUpperCase())} — ${z(r.name.toUpperCase())}${z(A)}
                  </div>
                  <div style="font-size: 9px; color: #475569; font-weight: bold; margin-top: 1px;">
                    ${z(m.school.name)} • ROK SZKOLNY ${z(m.yearLabel)} • ${P==="etap1"?"PLAN BAZOWY KLAS (ETAP 1)":"PLAN PRZYDZIAŁU SAL (ETAP 2)"}
                  </div>
                </div>
                <div style="text-align: right; font-size: 8px; color: #64748b; font-family: monospace; font-weight: bold; line-height: 1.2;">
                  SalePlan Pro · Razem sal: ${Me.length}<br>
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
                    ${p.map(I=>`
                      <th colspan="${I.span}" style="border: 1px solid #94a3b8; padding: 2.5px 2px; text-align: center; font-size: 9px; font-weight: bold; background-color: #f8fafc; color: #334155; box-sizing: border-box;">
                        📍 ${z(ue(I.name,I.buildingName))}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Segment level headers row -->
                  <tr style="background-color: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 7.5px; font-weight: 500; background-color: #f8fafc; color: #64748b; width: 54px; max-width: 54px; box-sizing: border-box;">
                      -
                    </th>
                    ${u.map(I=>`
                      <th colspan="${I.span}" style="border: 1px solid #94a3b8; padding: 2px; text-align: center; font-size: 8px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase; box-sizing: border-box;">
                        🧩 ${z(I.name)}
                      </th>
                    `).join("")}
                  </tr>
                  <!-- Room level headers row -->
                  <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <th style="border: 1px solid #94a3b8; padding: 3px 2px; text-align: center; font-size: 9px; font-weight: 900; width: 54px; max-width: 54px; color: #1e293b; box-sizing: border-box;">
                      Nr
                    </th>
                    ${a.map(I=>{const C=I.room.sub||"sala ogólna";return`
                        <th style="border: 1px solid #94a3b8; padding: ${x}; text-align: center; font-size: 9.5px; font-weight: 950; color: #020617; width: calc((100% - 54px) / ${c}); box-sizing: border-box;">
                          <span style="font-family: monospace; font-size: ${N}; display: block;">🚪 ${z(I.room.num)}</span>
                          ${$?`<span style="font-size: ${k}; color: #475569; font-weight: 500; display: block; margin-top: 0.5px; text-transform: lowercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">(${z(C)})</span>`:""}
                        </th>
                      `}).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${y}
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
    `},we=()=>{try{const t=ut(),i=window.open("","_blank","noopener");i?(i.document.write(t),i.document.close()):Ie(!0)}catch(t){console.error(t),Ie(!0)}},ht=()=>{const t=m.dyzury.miejsca,i=m.dyzury.przerwy,s=Math.min(1,Math.max(.45,8/Math.max(t.length,1)));let o="";return[0,1,2,3,4].forEach(n=>{let r="";i.forEach(l=>{let a="";t.forEach(d=>{const c=`${d.id}|${n}|${l.num}`,p=m.dyzury.harmonogram[c],u=p!=null&&p.teacherAbbr?m.teachers.find(h=>h.abbr===p.teacherAbbr):null;let x="-";p!=null&&p.teacherAbbr&&(x=`
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${z(p.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${u?z(`${u.first} ${u.last}`):""}">
                ${u?`${z(u.first.slice(0,1))}. ${z(u.last)}`:"Dyżur"}
              </div>
            `),a+=`
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${x}
            </td>
          `}),r+=`
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${z(l.name||`Przerwa ${l.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${z(l.start)} - ${z(l.end)}</div>
            </td>
            ${a}
          </tr>
        `}),o+=`
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${z(G[n])} — HARMONOGRAM DYŻURÓW</span>
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
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${z(l.name)}</div>
                      ${l.floor?`<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${z(l.floor)}</div>`:""}
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${r}
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
            <p>${z(m.school.name)} — Rok szkolny ${z(m.yearLabel)}</p>
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
    `},ft=()=>{try{const t=ht(),i=window.open("","_blank","noopener");i?(i.document.write(t),i.document.close()):he(!0)}catch(t){console.error(t),he(!0)}},Ne=w.useMemo(()=>T==="all"?b.classes:b.classes.filter(t=>t.id===T),[b.classes,T]),ke=w.useMemo(()=>M==="all"?b.teachers:b.teachers.filter(t=>t.id===M),[b.teachers,M]),Me=w.useMemo(()=>R==="all"?b.rooms:b.rooms.filter(t=>t.id===R),[b.rooms,R]),V=w.useMemo(()=>{const t=jt(m.floors),i=R==="all"?t:t.filter(a=>{const d=(a.room.num||"").toLowerCase().trim(),c=b.rooms.find(p=>p.name.toLowerCase().trim()===d);return c&&c.id===R}),s=[],o=[],n=[],r=new Map(b.rooms.map(a=>[a.name.toLowerCase().trim(),a]));i.forEach(a=>{const d=(a.room.num||"").toLowerCase().trim(),c=r.get(d),p=m.buildings[a.floor.buildingIdx],u=(c==null?void 0:c.type)==="indywidualne",x=(c==null?void 0:c.type)==="sport"||(p==null?void 0:p.multi)===!0;u?o.push(a):x?n.push(a):s.push(a)});const l=(a,d)=>{const c=a.room.num||"",p=d.room.num||"";return c.localeCompare(p,void 0,{numeric:!0,sensitivity:"base"})};return s.sort(l),o.sort(l),n.sort(l),{main:s,individual:o,sport:n}},[m.floors,m.buildings,b.rooms,R]),gt=w.useMemo(()=>{const t=[],i=new Set;return m.floors.forEach((s,o)=>{const n=m.buildings[s.buildingIdx],r=(n==null?void 0:n.name)||`Budynek ${s.buildingIdx+1}`,l=ue(s.name||`Piętro ${o+1}`,r),a=`f_${o}`;i.has(a)||(i.add(a),t.push({id:a,name:`${r} - ${l}`,buildingName:r}))}),t},[m.floors,m.buildings]),ce=w.useMemo(()=>{if(ge==="floors"){const t=[...V.main,...V.individual,...V.sport],i=je==="all"?t:t.filter(o=>`f_${o.floorIdx}`===je),s=new Map;return i.forEach(o=>{const n=`f_${o.floorIdx}`,r=m.buildings[o.floor.buildingIdx],l=(r==null?void 0:r.name)||`Budynek ${o.floor.buildingIdx+1}`,a=ue(o.floor.name||`Piętro ${o.floorIdx+1}`,l),d=`${l} — ${a}`;s.has(n)||s.set(n,{id:n,name:d,icon:"📍",floorIdx:o.floorIdx,cols:[]}),s.get(n).cols.push(o)}),Array.from(s.values()).sort((o,n)=>o.floorIdx-n.floorIdx).filter(o=>o.cols.length>0)}return[{id:"main",name:"Budynek Główny",icon:"🏢",cols:V.main},{id:"individual",name:"Nauczanie Indywidualne",icon:"🗣️",cols:V.individual},{id:"sport",name:"Sale Sportowe",icon:"🏆",cols:V.sport}].filter(t=>t.cols.length>0)},[ge,je,V,m.floors,m.buildings]);if(fe){const t=ne==="all"?[0,1,2,3,4]:[ne],i=oe==="all"?ce:ce.filter(s=>s.id===oe);return e.jsxs("div",{id:"rooms-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
              size: ${J};
              margin: 6mm 8mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-amber-400",children:e.jsx(E,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Studio Wydruku Płachty Sal"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Płachta Obłożenia Gabinetów • Układ A4 ",J==="landscape"?"Poziomy":"Pionowy"]})]})]}),e.jsxs("div",{className:"flex items-center gap-2.5 flex-wrap",children:[e.jsxs("div",{className:"flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700",children:[e.jsx("button",{onClick:()=>Ue("landscape"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${J==="landscape"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"}),e.jsx("button",{onClick:()=>Ue("portrait"),className:`px-3 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${J==="portrait"?"bg-amber-500 text-slate-950 shadow-sm":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Układ tabel:"}),e.jsxs("select",{value:ge,onChange:s=>rt(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"floors",className:"bg-slate-800 text-white",children:"Podział wg Kondygnacji (Zalecany)"}),e.jsx("option",{value:"cols",className:"bg-slate-800 text-white",children:"Wg Kategorii / Budynków"})]})]}),ge==="floors"&&e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Piętro:"}),e.jsxs("select",{value:je,onChange:s=>nt(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kondygnacje"}),gt.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Sal / strona:"}),e.jsxs("select",{value:re,onChange:s=>ot(parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:8,className:"bg-slate-800 text-white",children:"8 sal (Duża czytelność)"}),e.jsx("option",{value:10,className:"bg-slate-800 text-white",children:"10 sal (Zalecane A4)"}),e.jsx("option",{value:12,className:"bg-slate-800 text-white",children:"12 sal (Standard)"}),e.jsx("option",{value:15,className:"bg-slate-800 text-white",children:"15 sal (Kompakt)"}),e.jsx("option",{value:0,className:"bg-slate-800 text-white",children:"Wszystkie w 1 tabeli"})]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Dzień:"}),e.jsxs("select",{value:ne,onChange:s=>lt(s.target.value==="all"?"all":parseInt(s.target.value,10)),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie dni (Pn-Pt)"}),G.map((s,o)=>e.jsx("option",{value:o,className:"bg-slate-800 text-white",children:s},o))]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-400 uppercase",children:"Budynek:"}),e.jsxs("select",{value:oe,onChange:s=>it(s.target.value),className:"bg-transparent text-white text-[11px] font-black outline-none cursor-pointer",children:[e.jsx("option",{value:"all",className:"bg-slate-800 text-white",children:"Wszystkie kategorie"}),ce.map(s=>e.jsx("option",{value:s.id,className:"bg-slate-800 text-white",children:s.name},s.id))]})]}),e.jsxs("button",{onClick:we,className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer",title:"Otwórz czysty HTML w nowej karcie",children:[e.jsx(wt,{size:14})," W osobnym oknie"]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer",children:[e.jsx(E,{size:15})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>Ie(!1),className:"px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer",children:"Zamknij"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8",children:t.map(s=>e.jsx("div",{className:"space-y-6",children:i.map(o=>{const n=Xe(o.cols,re>0?re:o.cols.length);return n.map((r,l)=>{const a=r.length,d=Ge(r,m.buildings),c=Te(r),p=n.length>1?` — Część ${l+1}/${n.length} (Sal: ${a})`:` (Sal: ${a})`;return e.jsxs("div",{className:"rooms-sheet-card bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-md transition",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-base md:text-lg font-black text-slate-950 tracking-tight flex items-center gap-2",children:e.jsxs("span",{children:["📅 ",G[s].toUpperCase()," — ",o.name.toUpperCase(),p]})}),e.jsxs("p",{className:"text-[10.5px] text-slate-600 font-bold uppercase mt-0.5",children:[m.school.name," • Rok szkolny ",m.yearLabel," • ",P==="etap1"?"Plan Bazowy Klas (Etap 1)":"Plan Przydziału Sal (Etap 2)"]})]}),e.jsxs("div",{className:"text-right text-[9px] font-mono text-slate-400 font-bold uppercase leading-tight",children:["SalePlan Pro • Sal w szkole: ",Me.length,e.jsx("br",{}),"Wydrukowano: ",new Date().toLocaleDateString("pl-PL")]})]}),e.jsx("div",{className:"w-full overflow-hidden",children:e.jsxs("table",{className:"w-full text-xs text-left border-collapse table-fixed bg-white",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Godz"}),d.map((u,x)=>e.jsxs("th",{colSpan:u.span,className:"border border-slate-300 p-1.5 text-center text-[9.5px] bg-slate-50 font-bold text-slate-700",children:["📍 ",ue(u.name,u.buildingName)]},x))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1 text-center text-[8px] bg-slate-50 font-medium text-slate-400",children:"-"}),c.map((u,x)=>e.jsxs("th",{colSpan:u.span,className:"border border-slate-300 p-1 text-center text-[8.5px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",u.name]},x))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 text-center text-[10px]",children:"Nr"}),r.map((u,x)=>e.jsxs("th",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 text-center",children:[e.jsxs("span",{className:"font-mono text-[10.5px] block text-slate-950 font-black",children:["🚪 ",u.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-full mx-auto mt-0.5",children:["(",u.room.sub||"sala ogólna",")"]})]},x))]})]}),e.jsx("tbody",{children:U.map((u,x)=>e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"w-[52px] min-w-[52px] max-w-[52px] border border-slate-300 p-1.5 font-mono text-center bg-slate-50/60",children:[e.jsx("span",{className:"font-black text-slate-900 text-[11px] block",children:u.num}),e.jsxs("span",{className:"block text-[7.5px] text-slate-500 leading-none mt-0.5 font-medium",children:[u.start,"-",u.end]})]}),r.map((h,g)=>{const f=Ee(h,s,u.num,x);return e.jsx("td",{style:{width:`calc((100% - 52px) / ${a})`},className:"border border-slate-300 p-1.5 align-middle text-center bg-white min-h-[44px]",children:f.length>0?e.jsx("div",{className:"space-y-1.5",children:f.map((j,N)=>e.jsxs("div",{className:"leading-tight flex flex-col items-center justify-center gap-0.5",title:`${j.displayText} (${j.subject})`,children:[e.jsxs("div",{className:"flex items-center justify-center gap-1",children:[e.jsx("span",{className:"font-black text-slate-950 text-[10px] bg-amber-100/90 border border-amber-300/90 rounded px-1.5 py-0.5 inline-block",children:j.className}),j.groupShort&&e.jsx("span",{className:"bg-purple-100 text-purple-900 border border-purple-200 px-1 py-0.2 rounded text-[8px] font-black inline-block",children:j.groupShort})]}),e.jsx("span",{className:"text-[9.5px] text-slate-900 font-extrabold truncate max-w-full",title:j.subject,children:j.subjectShort||j.subject}),j.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 text-slate-800 border border-slate-300 px-1 py-0.2 rounded text-[8px] font-mono font-bold inline-block",children:j.teacherAbbr})]},N))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},g)})]},u.num))})]})})]},`${s}-${o.id}-${l}`)})})},s))})]})}if($e)return e.jsxs("div",{id:"weekly-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
              size: ${ae};
              margin: 10mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-indigo-400",children:e.jsx(E,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Tryb przygotowania do druku"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Podgląd Tygodniowego Planu • ",v==="classes"?"Oddziały":"Nauczyciele"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>Ke("portrait"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${ae==="portrait"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"}),e.jsx("button",{onClick:()=>Ke("landscape"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${ae==="landscape"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"})]}),v==="classes"?e.jsxs("select",{value:T,onChange:t=>K(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]}):e.jsxs("select",{value:M,onChange:t=>H(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first]},t.id))]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(E,{size:13})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>We(!1),className:"px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer",children:"Zamknij podgląd"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:v==="classes"?Ne.map((t,i)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${i<Ne.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN LEKCJI • KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",P==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),G.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:U.map((s,o)=>{const n=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let l=[];return P==="etap1"?Object.entries(b.lessons).filter(([d])=>{const c=d.split("|");return c[0]===t.id&&parseInt(c[1],10)===r&&parseInt(c[2],10)===o}).forEach(([d,c])=>{var p,u;if(c){const x=b.assignments.find(h=>h.id===c.assignmentId);if(x){const h=((p=_.get(x.subjectId))==null?void 0:p.name)||"Inny",g=x.groupId?(u=b.schoolGroups)==null?void 0:u.find(k=>k.id===x.groupId):null,f=g?`[${g.name}] ${h}`:h,j=x.teacherId?Le.get(x.teacherId):null,N=x.roomId?de.get(x.roomId):null;l.push({subject:f,teacherAbbr:j==null?void 0:j.abbr,roomName:N==null?void 0:N.name})}}}):(((ee.classes[t.id]||{})[r]||{})[n]||[]).forEach(p=>{l.push({subject:p.subject,teacherAbbr:p.teacherAbbr,roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:l.length>0?e.jsx("div",{className:"space-y-1.5",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[a.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:a.teacherAbbr}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)):ke.map((t,i)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${i<ke.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN NAUCZYCIELA • ",t.last.toUpperCase()," ",t.first.toUpperCase()," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[m.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",m.yearLabel," • ",P==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),G.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:U.map((s,o)=>{const n=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-200 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let l=[];return P==="etap1"?Object.entries(b.lessons).forEach(([a,d])=>{var h,g;const c=a.split("|"),p=c[0],u=parseInt(c[1],10),x=parseInt(c[2],10);if(u===r&&x===o){const f=b.assignments.find(j=>j.id===d.assignmentId);if(f&&f.teacherId===t.id){const j=((h=_.get(f.subjectId))==null?void 0:h.name)||"Inny",N=((g=ie.get(p))==null?void 0:g.name)||"Inna",k=f.roomId?de.get(f.roomId):null;l.push({subject:j,className:N,roomName:k==null?void 0:k.name})}}}):(((ee.teachers[t.id]||{})[r]||{})[n]||[]).forEach(p=>{var u;l.push({subject:p.subject,className:p.className||((u=p.classes)==null?void 0:u.join("+"))||"Klasa",roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:l.length>0?e.jsx("div",{className:"space-y-1.5",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id))})]});const et=t=>!t||t.length===0?null:t.map((i,s)=>{var l;const o=i.className||((l=i.classes)==null?void 0:l.join(", "))||"",n=i.subject||"",r=i.note||"";return e.jsxs("div",{className:"text-[10px] font-semibold text-slate-700 leading-tight",children:["📚 ",e.jsx("span",{className:"font-extrabold text-slate-900",children:n})," (kl. ",o,", s. ",r,")"]},s)});return e.jsxs("div",{className:"flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto",children:[at&&e.jsx("div",{className:"mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:"text-xl shrink-0",children:"⚠️"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase tracking-tight",children:"Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)"}),e.jsxs("p",{className:"text-[11px] text-amber-800 leading-normal font-semibold mt-1",children:["Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (",e.jsx("code",{className:"font-mono bg-amber-100 px-1 py-0.5 rounded",children:"window.print()"}),") oraz otwierania nowych okien z wnętrza takich ramek."]}),e.jsxs("div",{className:"bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"1"}),e.jsxs("span",{children:["Kliknij okrągłą ikonę ze strzałką ",e.jsx("strong",{className:"font-black",children:'"Otwórz w nowej karcie"'})," w prawym górnym rogu podglądu aplikacji."]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"2"}),e.jsxs("span",{children:["W nowym oknie przycisk ",e.jsx("strong",{className:"font-black",children:'"Drukuj teraz"'})," oraz ",e.jsx("strong",{className:"font-black",children:'"Podgląd płachty sal"'})," zadziałają natychmiast!"]})]})]})]})]})}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:e.jsx(E,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"Centrum Wydruków i Publikacji"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase mt-0.5",children:"Wygodne drukowanie planów lekcji i dyżurów"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[v==="rooms"&&e.jsxs("button",{onClick:we,className:"px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:15,className:"animate-pulse"})," Podgląd płachty sal"]}),v==="duties"&&e.jsxs("button",{onClick:()=>ye(!0),className:"px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:15,className:"animate-pulse"})," Podgląd dyżurów"]}),(v==="classes"||v==="teachers")&&e.jsxs("button",{onClick:()=>We(!0),className:"px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",title:"Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu",children:[e.jsx(Re,{size:15})," Generuj Tygodniowy Plan"]}),e.jsxs("button",{onClick:bt,className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer",children:[e.jsx(E,{size:15})," Drukuj teraz (Ctrl+P)"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Typ wydruku"}),e.jsxs("div",{className:"grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>L("classes"),className:`py-1.5 text-[11px] font-black rounded-md transition ${v==="classes"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Plan Klas"}),e.jsx("button",{onClick:()=>L("teachers"),className:`py-1.5 text-[11px] font-black rounded-md transition ${v==="teachers"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Nauczyciele"}),e.jsx("button",{onClick:()=>L("rooms"),className:`py-1.5 text-[11px] font-black rounded-md transition ${v==="rooms"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Gabinety"}),e.jsx("button",{onClick:()=>L("duties"),className:`py-1.5 text-[11px] font-black rounded-md transition ${v==="duties"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Dyżury"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Siatka Lekcji"}),e.jsxs("select",{value:P,onChange:t=>se(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"etap1",children:"Etap 1: Plan Klas (Siatka bazowa)"}),e.jsx("option",{value:"etap2",children:"Etap 2: Plan Sal (Przydzielone gabinety)"})]})]}),v==="classes"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Klasę"}),e.jsxs("select",{value:T,onChange:t=>K(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały (każdy na nowej stronie)"}),b.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]})]}),v==="teachers"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Nauczyciela"}),e.jsxs("select",{value:M,onChange:t=>H(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele (każdy na nowej stronie)"}),b.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first," (",t.abbr,")"]},t.id))]})]}),v==="rooms"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Gabinet"}),e.jsxs("select",{value:R,onChange:t=>Z(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie sale/gabinety"}),b.rooms.map(t=>e.jsxs("option",{value:t.id,children:[t.name," (",t.desc||"sala ogólna",")"]},t.id))]})]}),v==="rooms"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:we,className:"w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid",children:[e.jsx(E,{size:15})," Podgląd wydruku płachty sal"]})]}),v==="duties"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:()=>ye(!0),className:"w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",children:[e.jsx(E,{size:15})," Podgląd wydruku dyżurów"]})]})]}),v==="teachers"&&e.jsx("div",{className:"mt-5 pt-5 border-t border-slate-100 space-y-4 text-left",children:e.jsxs("div",{className:"bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx("span",{className:"p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs",children:"📅"}),e.jsx("span",{className:"text-xs font-black uppercase text-indigo-900 tracking-wide",children:"Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Początek okresu (Pierwszy dzień lekcji)"}),e.jsx("input",{type:"date",value:Se,onChange:t=>Ye(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Koniec okresu (Ostatni dzień lekcji)"}),e.jsx("input",{type:"date",value:Ce,onChange:t=>Fe(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Format tytułu wydarzenia w kalendarzu"}),e.jsxs("select",{value:De,onChange:t=>xt(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none",children:[e.jsx("option",{value:"[Przedmiot] - [Klasa] [Sala]",children:"[Przedmiot] - [Klasa] [Sala]"}),e.jsx("option",{value:"[Klasa] - [Przedmiot] [Sala]",children:"[Klasa] - [Przedmiot] [Sala]"}),e.jsx("option",{value:"[Przedmiot] ([Klasa]) (Sala: [Sala])",children:"[Przedmiot] ([Klasa]) ([Sala])"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",children:[e.jsxs("div",{className:"text-[10px] text-slate-500 leading-relaxed max-w-xl",children:["💡 ",e.jsx("strong",{children:"Wskazówka:"})," Kliknij przycisk ",e.jsx("span",{className:"bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]",children:"Pobierz kalendarz (.ics)"})," przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania."]}),e.jsxs("div",{className:"flex gap-2 flex-wrap w-full lg:w-auto",children:[M!=="all"&&e.jsxs("button",{onClick:()=>{const t=b.teachers.find(i=>i.id===M);t&&Ve(t)},className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(Re,{size:13})," Pobierz dla ",(tt=b.teachers.find(t=>t.id===M))==null?void 0:tt.abbr]}),e.jsxs("button",{onClick:mt,className:"px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid",children:[e.jsx(Nt,{size:13})," Wspólny plik dla KADRY"]})]})]})]})})]}),e.jsxs("div",{className:"print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:[v==="classes"&&Ne.map((t,i)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${i<Ne.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI · KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",P==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),G.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:U.map((s,o)=>{const n=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let l=[];return P==="etap1"?Object.entries(b.lessons).filter(([d])=>{const c=d.split("|");return c[0]===t.id&&parseInt(c[1],10)===r&&parseInt(c[2],10)===o}).forEach(([d,c])=>{var p,u;if(c){const x=b.assignments.find(h=>h.id===c.assignmentId);if(x){const h=((p=_.get(x.subjectId))==null?void 0:p.name)||"Inny",g=x.groupId?(u=b.schoolGroups)==null?void 0:u.find(k=>k.id===x.groupId):null,f=g?`[${g.name}] ${h}`:h,j=x.teacherId?Le.get(x.teacherId):null,N=x.roomId?de.get(x.roomId):null;l.push({subject:f,teacherAbbr:j==null?void 0:j.abbr,roomName:N==null?void 0:N.name})}}}):(((ee.classes[t.id]||{})[r]||{})[n]||[]).forEach(p=>{l.push({subject:p.subject,teacherAbbr:p.teacherAbbr,roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:l.length>0?e.jsx("div",{className:"space-y-1",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[a.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:a.teacherAbbr}),a.roomName&&e.jsxs("span",{className:"bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded",children:["f. ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)),v==="teachers"&&ke.map((t,i)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${i<ke.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI NAUCZYCIELA: ",t.last," ",t.first," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("button",{onClick:()=>Ve(t),className:"no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid",title:"Pobierz plik kalendarza (.ics) dla tego nauczyciela",children:[e.jsx(Re,{size:11})," Pobierz kalendarz (.ics)"]}),e.jsxs("div",{className:"text-right text-[9px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",P==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),G.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:U.map((s,o)=>{const n=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(r=>{let l=[];return P==="etap1"?Object.entries(b.lessons).forEach(([a,d])=>{var h,g;const c=a.split("|"),p=c[0],u=parseInt(c[1],10),x=parseInt(c[2],10);if(u===r&&x===o){const f=b.assignments.find(j=>j.id===d.assignmentId);if(f&&f.teacherId===t.id){const j=((h=_.get(f.subjectId))==null?void 0:h.name)||"Inny",N=((g=ie.get(p))==null?void 0:g.name)||"Inna",k=f.roomId?de.get(f.roomId):null;l.push({subject:j,className:N,roomName:k==null?void 0:k.name})}}}):(((ee.teachers[t.id]||{})[r]||{})[n]||[]).forEach(p=>{var u;l.push({subject:p.subject,className:p.className||((u=p.classes)==null?void 0:u.join("+"))||"Klasa",roomName:p.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:l.length>0?e.jsx("div",{className:"space-y-1",children:l.map((a,d)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1.5 rounded",children:["s. ",a.roomName]})]})]},d))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},r)})]},s.num)})})]})]},t.id)),v==="rooms"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",P==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase no-print",children:"Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty."}),e.jsxs("div",{className:"no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",children:[e.jsxs("div",{className:"space-y-1 text-left",children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase",children:"✨ Dedykowany Wydruk Płachty Dyrektorskiej"}),e.jsx("p",{className:"text-[11px] text-amber-700 leading-normal font-medium max-w-3xl",children:"Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki."})]}),e.jsxs("button",{onClick:we,className:"shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:14,className:"animate-pulse"})," Podgląd i Druk Płachty (A4 Poziomo)"]})]}),Me.length===0?e.jsx("p",{className:"text-xs text-slate-400 p-4 text-center",children:"Brak gabinetów do wyświetlenia w wybranym filtrze."}):e.jsx("div",{className:"space-y-12",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"page-break last:pb-0 pb-2",children:[e.jsxs("div",{className:"bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300",children:[e.jsxs("span",{className:"text-xs font-black uppercase tracking-wide",children:["📅 ",G[t]," — PŁACHTA OBŁOŻENIA GABINETÓW"]}),e.jsx("span",{className:"text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500",children:"Podział na kategorie"})]}),e.jsx("div",{className:"space-y-6",children:ce.map(i=>{const s=Ge(i.cols,m.buildings),o=Te(i.cols);return e.jsxs("div",{className:"border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 px-1",children:[e.jsx("span",{className:"text-sm",children:i.icon}),e.jsxs("h4",{className:"text-[11px] font-black text-slate-700 uppercase tracking-wider",children:[i.name," (",i.cols.length,")"]})]}),e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lekcja / Godz"}),s.map((n,r)=>e.jsxs("th",{colSpan:n.span,className:"border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700",children:["📍 ",ue(n.name,n.buildingName)]},r))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400",children:"-"}),o.map((n,r)=>e.jsxs("th",{colSpan:n.span,className:"border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",n.name]},r))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:"Godzina"}),i.cols.map((n,r)=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]",children:[e.jsxs("span",{className:"font-mono text-[11px] block text-slate-900",children:["🚪 ",n.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto",children:["(",n.room.sub||"sala ogólna",")"]})]},r))]})]}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:U.map((n,r)=>(String(n.num),e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[11px]",children:n.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[n.start,"-",n.end]})]}),i.cols.map((l,a)=>{const d=Ee(l,t,n.num,r);return e.jsx("td",{className:"border border-slate-300 p-1.5 align-middle text-center min-h-[50px] bg-white",children:d.length>0?e.jsx("div",{className:"space-y-1.5",children:d.map((c,p)=>e.jsxs("div",{className:"text-[10px] leading-tight flex flex-col items-center justify-center gap-0.5",title:`${c.displayText} (${c.subject})`,children:[e.jsxs("div",{className:"flex items-center justify-center gap-1",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[10.5px] bg-amber-100/70 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block",children:c.className}),c.groupShort&&e.jsx("span",{className:"bg-purple-100 text-purple-900 border border-purple-200 px-1 py-0.2 rounded text-[8.5px] font-black inline-block",children:c.groupShort})]}),e.jsx("span",{className:"text-[9.5px] text-slate-800 font-extrabold truncate max-w-full",title:c.subject,children:c.subjectShort||c.subject}),c.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold inline-block",children:c.teacherAbbr})]},p))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},n.num)))})]})})]},i.id)})})]},t))})]}),v==="duties"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[m.school.name," (",m.yearLabel,")"]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:"Generowane przez SalePlan Pro · Moduł Dyżurów"})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase",children:"Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych."}),e.jsx("div",{className:"space-y-8",children:[0,1,2,3,4].map(t=>{const i=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(o=>{var r;const n=`${s.id}|${t}|${o.num}`;return!!((r=m.dyzury.harmonogram[n])!=null&&r.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5",children:["📅 ",G[t]]}),i?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs border-collapse border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-200 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2.5 font-mono text-[9px] text-left",children:[e.jsx("span",{className:"font-extrabold text-slate-800",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-0.5",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(o=>{const n=`${o.id}|${t}|${s.num}`,r=m.dyzury.harmonogram[n],l=r!=null&&r.teacherAbbr?m.teachers.find(a=>a.abbr===r.teacherAbbr):null;return e.jsx("td",{className:"border border-slate-300 p-2 text-center align-middle",children:r!=null&&r.teacherAbbr?e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300",children:r.teacherAbbr}),e.jsx("span",{className:"block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500",children:l?`${l.first.slice(0,1)}. ${l.last}`:"Dyżur"})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},o.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})]}),dt&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl",children:e.jsx(E,{size:22,className:"animate-pulse"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-emerald-400 block uppercase font-black tracking-wider",children:"Dynamiczny Podgląd i Weryfikacja • SchedData"}),e.jsx("h3",{className:"text-lg font-black uppercase text-white leading-tight",children:"Harmonogram Dyżurów Nauczycielskich"})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Dzień Tygodnia"}),e.jsxs("select",{value:Ae,onChange:t=>{const i=t.target.value;pt(i==="all"?"all":parseInt(i,10))},className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie dni tygodnia"}),[0,1,2,3,4].map(t=>e.jsx("option",{value:t,children:G[t]},t))]})]}),e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Skala (Zoom)"}),e.jsxs("select",{value:Pe,onChange:t=>ct(parseFloat(t.target.value)),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"0.7",children:"70% (Gęsty/Kompaktowy)"}),e.jsx("option",{value:"0.8",children:"80%"}),e.jsx("option",{value:"0.85",children:"85%"}),e.jsx("option",{value:"0.9",children:"90%"}),e.jsx("option",{value:"1.0",children:"100% (Standardowy)"}),e.jsx("option",{value:"1.1",children:"110% (Powiększony)"})]})]}),e.jsx("div",{className:"flex items-end h-full",children:e.jsxs("button",{onClick:ft,className:"h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",title:"Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF",children:[e.jsx(E,{size:15})," Drukuj / Generuj PDF"]})}),e.jsx("div",{className:"flex items-end h-full",children:e.jsx("button",{onClick:()=>ye(!1),className:"h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center",children:e.jsx(kt,{size:18})})})]})]}),e.jsx("div",{className:"p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("div",{className:"mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8",style:{transform:`scale(${Pe})`,transformOrigin:"top center",width:`${100/Pe}%`,transition:"transform 0.15s ease-out, width 0.15s ease-out"},children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-xl font-black text-slate-950",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-extrabold uppercase",children:[m.school.name," • Rok szkolny ",m.yearLabel]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:"Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)"})]}),e.jsx("div",{className:"space-y-8 text-left",children:[0,1,2,3,4].filter(t=>Ae==="all"||Ae===t).map(t=>{const i=m.dyzury.miejsca.some(s=>m.dyzury.przerwy.some(o=>{var r;const n=`${s.id}|${t}|${o.num}`;return!!((r=m.dyzury.harmonogram[n])!=null&&r.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between",children:[e.jsxs("span",{children:["📅 ",G[t]]}),e.jsxs("span",{className:"text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider",children:[m.dyzury.miejsca.length," Miejsc • ",m.dyzury.przerwy.length," Przerw"]})]}),i?m.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs",children:e.jsxs("table",{className:"w-full text-xs border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200",children:"Godzina / Przerwa"}),m.dyzury.miejsca.map(s=>e.jsxs("th",{className:"p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:m.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30",children:[e.jsx("span",{className:"font-extrabold text-slate-800 block text-xs",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-1",children:["⏱️ ",s.start," - ",s.end]})]}),m.dyzury.miejsca.map(o=>{var h;const n=`${o.id}|${t}|${s.num}`,r=m.dyzury.harmonogram[n],l=r!=null&&r.teacherAbbr?m.teachers.find(g=>g.abbr===r.teacherAbbr):null,a=(l==null?void 0:l.id)||(r==null?void 0:r.teacherAbbr)||"",d=a?((h=ee.teachers[a])==null?void 0:h[t])||{}:{},c=a?d[String(s.num)]||[]:[],p=a?d[String(s.num+1)]||[]:[],u=a?Object.values(d).some(g=>Array.isArray(g)&&g.length>0):!1,x=m.dyzury.miejsca.filter(g=>g.id!==o.id).map(g=>{const f=`${g.id}|${t}|${s.num}`;return{placeName:g.name,entry:m.dyzury.harmonogram[f]}}).filter(g=>{var f;return((f=g.entry)==null?void 0:f.teacherAbbr)===(r==null?void 0:r.teacherAbbr)});return e.jsx("td",{className:"p-3 text-center align-middle border-r border-slate-200 last:border-r-0",children:r!=null&&r.teacherAbbr?e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-2",children:[e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block",children:r.teacherAbbr}),e.jsx("span",{className:"block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1",children:l?`${l.first} ${l.last}`:"Dyżur"})]}),e.jsxs("div",{className:"w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg",children:[e.jsx("div",{className:"text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1",children:"Weryfikacja lekcji:"}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Przed przerwą: "}),c.length>0?et(c):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Po przerwie: "}),p.length>0?et(p):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]})]}),(x.length>0||!u)&&e.jsxs("div",{className:"w-full space-y-1",children:[x.length>0&&e.jsxs("div",{className:"bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left",children:["🚨 Kolizja: Jednoczesny dyżur w rejonie: ",x.map(g=>g.placeName).join(", ")]}),!u&&e.jsx("div",{className:"bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left",children:"⚠️ Brak innych lekcji w tym dniu!"})]})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},o.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0",children:[e.jsx("span",{className:"text-xs text-slate-400 font-semibold uppercase",children:"Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim"}),e.jsx("button",{onClick:()=>ye(!1),className:"px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition",children:"Zamknij podgląd"})]})]})}),st&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200",children:[e.jsx("h3",{className:"text-sm font-black text-slate-900 uppercase tracking-tight mb-2",children:"Pop-up zablokowany lub zakazany w bezpiecznym iFrame"}),e.jsx("p",{className:"text-xs text-slate-600 leading-relaxed mb-4",children:"Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:"}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"1"}),e.jsx("span",{children:"Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"2"}),e.jsx("span",{children:"Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"3"}),e.jsxs("span",{children:["Alternatywnie użyj przycisku ",e.jsx("strong",{className:"font-black text-slate-900",children:"Drukuj teraz"})," w menu głównym."]})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-3",children:[e.jsx("button",{onClick:()=>{he(!1),window.print()},className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer",children:"Drukuj stąd"}),e.jsx("button",{onClick:()=>he(!1),className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer",children:"Rozumiem"})]})]})})]})}export{St as default};
