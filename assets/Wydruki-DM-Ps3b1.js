import{r as k,j as e}from"./vendor-react-NQNxyWao.js";import{f as nt,a as Ue,c as Ye}from"./index-Cv8eLmVD.js";import{P as E,C as we,g as lt,X as it}from"./vendor-lucide-BYSd99_m.js";import"./vendor-motion-FDUFV107.js";const M=["Poniedziałek","Wtorek","Środa","Czwartek","Piątek"];function v(p){return String(p??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function He(p,R){const w=[];let I=null;return p.forEach(($,Q)=>{const L=$.floor.buildingIdx,W=R[L],C=(W==null?void 0:W.name)||"",K=$.floor.id,D=$.floor.name,U=`${L}|${K}`;!I||I.key!==U?(I={startIdx:Q,span:1,key:U,name:D,buildingName:C},w.push(I)):I.span++}),w}function Be(p){const R=[];let w=null;return p.forEach((I,$)=>{var D,U;const Q=I.floor.buildingIdx,L=I.floor.id,W=((D=I.seg)==null?void 0:D.id)||"default_seg",C=((U=I.seg)==null?void 0:U.name)||"Główny",K=`${Q}|${L}|${W}`;!w||w.key!==K?(w={startIdx:$,span:1,key:K,name:C},R.push(w)):w.span++}),R}function bt({appState:p,schedData:R}){var Me;const[w,I]=k.useState("classes"),[$,Q]=k.useState("etap1"),[L,W]=k.useState("all"),[C,K]=k.useState("all"),[D,U]=k.useState("all"),[Fe,B]=k.useState(!1),[Ze,Ne]=k.useState(!1),[me,ke]=k.useState(!1),[X,ve]=k.useState("landscape"),[Ve,oe]=k.useState(!1),[be,_e]=k.useState(1),[ue,qe]=k.useState("all");k.useEffect(()=>{try{Ne(window.self!==window.top)}catch{Ne(!0)}},[]),k.useEffect(()=>{if(me){let t=document.querySelector('meta[name="viewport"]');const d=t?t.getAttribute("content"):"";t||(t=document.createElement("meta"),t.setAttribute("name","viewport"),document.head.appendChild(t));const s=X==="landscape"?"1024":"768";t.setAttribute("content",`width=${s}, initial-scale=0.8, shrink-to-fit=no`);const c=document.createElement("style");return c.id="print-mobile-viewport-adjustments",c.innerHTML=`
        @media print {
          html, body {
            width: ${s}px !important;
            min-width: ${s}px !important;
          }
          #weekly-print-overlay {
            width: ${s}px !important;
            min-width: ${s}px !important;
          }
        }
      `,document.head.appendChild(c),()=>{t&&(d?t.setAttribute("content",d):t.removeAttribute("content"));const l=document.getElementById("print-mobile-viewport-adjustments");l&&l.remove()}}},[me,X]);const m=p.planLekcji,ee=k.useMemo(()=>{const t=p.yearLabel||"",d=t.match(/(\d{4})/);let s=new Date().getFullYear(),c=s+1;if(d){s=parseInt(d[1],10);const l=t.match(/\d{4}.*?(\d{4})/);l?c=parseInt(l[1],10):c=s+1}return{start:`${s}-09-01`,end:`${c}-06-25`}},[p.yearLabel]),[he,ze]=k.useState(ee.start),[fe,$e]=k.useState(ee.end),[ge,Je]=k.useState("[Przedmiot] - [Klasa] [Sala]");k.useEffect(()=>{ze(ee.start),$e(ee.end)},[ee]);const Ae=(t,d)=>{const s=new Date(t),c=d+1,l=s.getDay();let n=c-l;n<0&&(n+=7);const r=new Date(s);return r.setDate(s.getDate()+n),r},F=t=>{const d=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),c=String(t.getDate()).padStart(2,"0"),l=String(t.getHours()).padStart(2,"0"),n=String(t.getMinutes()).padStart(2,"0"),r=String(t.getSeconds()).padStart(2,"0");return`${d}${s}${c}T${l}${n}${r}`},Ie=t=>{const d=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),c=String(t.getDate()).padStart(2,"0");return`${d}${s}${c}T235959Z`},Z=t=>t?t.replace(/\\/g,"\\\\").replace(/,/g,"\\,").replace(/;/g,"\\;").replace(/\n/g,"\\n").trim():"",Pe=["MO","TU","WE","TH","FR"],Ce=t=>{const d=[];for(let s=0;s<5;s++)G.forEach((c,l)=>{const n=String(c.num);let r=[];$==="etap1"?Object.entries(m.lessons).forEach(([a,o])=>{var u,g;const b=a.split("|"),i=b[0],x=parseInt(b[1],10),f=parseInt(b[2],10);if(x===s&&f===l){const h=m.assignments.find(N=>N.id===o.assignmentId);if(h&&h.teacherId===t.id){const N=((u=Y.get(h.subjectId))==null?void 0:u.name)||"Inny",A=((g=te.get(i))==null?void 0:g.name)||"Inna",z=h.roomId?se.get(h.roomId):null;r.push({subject:N,className:A,roomName:z==null?void 0:z.name})}}}):(((V.teachers[t.id]||{})[s]||{})[n]||[]).forEach(i=>{var x;r.push({subject:i.subject,className:i.className||((x=i.classes)==null?void 0:x.join("+"))||"Klasa",roomName:i.note})}),r.forEach(a=>{d.push({dayIdx:s,hourNum:c.num,start:c.start,end:c.end,subject:a.subject,className:a.className,roomName:a.roomName})})});return d},De=t=>{const d=Ce(t);if(d.length===0){alert(`Nauczyciel ${t.last} ${t.first} nie ma przypisanych żadnych lekcji w wybranym planie.`);return}let s=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"];d.forEach(a=>{const o=Ae(he,a.dayIdx),[b,i]=a.start.split(":").map(Number),[x,f]=a.end.split(":").map(Number),u=new Date(o);u.setHours(b,i,0,0);const g=new Date(o);g.setHours(x,f,0,0);const h=ge.replace("[Przedmiot]",a.subject).replace("[Klasa]",a.className).replace("[Sala]",a.roomName?`s. ${a.roomName}`:"").replace(/\s+/g," ").trim(),N=`Lekcja: ${a.hourNum} (${a.start}-${a.end})\\nNauczyciel: ${t.last} ${t.first} (${t.abbr})\\nKlasa: ${a.className}\\n`+(a.roomName?`Sala: ${a.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",A=a.roomName?`Sala ${a.roomName}`:"",z=`asg-${t.id}-${a.dayIdx}-${a.hourNum}-${a.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}@saleplan.pro`,P=new Date(fe);s.push("BEGIN:VEVENT"),s.push(`UID:${z}`),s.push(`DTSTAMP:${F(new Date)}Z`),s.push(`DTSTART:${F(u)}`),s.push(`DTEND:${F(g)}`),s.push(`RRULE:FREQ=WEEKLY;UNTIL=${Ie(P)};BYDAY=${Pe[a.dayIdx]}`),s.push(`SUMMARY:${Z(h)}`),s.push(`LOCATION:${Z(A)}`),s.push(`DESCRIPTION:${Z(N)}`),s.push("END:VEVENT")}),s.push("END:VCALENDAR");const c=s.join(`\r
`),l=new Blob([c],{type:"text/calendar;charset=utf-8"}),n=URL.createObjectURL(l),r=document.createElement("a");r.href=n,r.download=`plan_${t.last}_${t.first}.ics`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)},Qe=()=>{let t=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SalePlan Pro//NONSGML v1.0//PL","CALSCALE:GREGORIAN","METHOD:PUBLISH"],d=0;if(m.teachers.forEach(r=>{Ce(r).forEach(o=>{d++;const b=Ae(he,o.dayIdx),[i,x]=o.start.split(":").map(Number),[f,u]=o.end.split(":").map(Number),g=new Date(b);g.setHours(i,x,0,0);const h=new Date(b);h.setHours(f,u,0,0);const N=`[${r.abbr}] `+ge.replace("[Przedmiot]",o.subject).replace("[Klasa]",o.className).replace("[Sala]",o.roomName?`s. ${o.roomName}`:"").replace(/\s+/g," ").trim(),A=`Nauczyciel: ${r.last} ${r.first} (${r.abbr})\\nLekcja: ${o.hourNum} (${o.start}-${o.end})\\nKlasa: ${o.className}\\n`+(o.roomName?`Sala: ${o.roomName}\\n`:"")+"Wygenerowano automatycznie z SalePlan Pro",z=o.roomName?`Sala ${o.roomName}`:"",P=`asg-all-${r.id}-${o.dayIdx}-${o.hourNum}-${o.className.replace(/[^a-zA-Z0-9]/g,"")}-${Date.now()}-${d}@saleplan.pro`,j=new Date(fe);t.push("BEGIN:VEVENT"),t.push(`UID:${P}`),t.push(`DTSTAMP:${F(new Date)}Z`),t.push(`DTSTART:${F(g)}`),t.push(`DTEND:${F(h)}`),t.push(`RRULE:FREQ=WEEKLY;UNTIL=${Ie(j)};BYDAY=${Pe[o.dayIdx]}`),t.push(`SUMMARY:${Z(N)}`),t.push(`LOCATION:${Z(z)}`),t.push(`DESCRIPTION:${Z(A)}`),t.push("END:VEVENT")})}),d===0){alert("Brak przypisanych lekcji w całym planie lekcji.");return}t.push("END:VCALENDAR");const s=t.join(`\r
`),c=new Blob([s],{type:"text/calendar;charset=utf-8"}),l=URL.createObjectURL(c),n=document.createElement("a");n.href=l,n.download="plan_wszyscy_nauczyciele.ics",document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(l)},te=k.useMemo(()=>new Map(m.classes.map(t=>[t.id,t])),[m.classes]),re=k.useMemo(()=>new Map(m.teachers.map(t=>[t.id,t])),[m.teachers]),Y=k.useMemo(()=>new Map(m.subjects.map(t=>[t.id,t])),[m.subjects]),se=k.useMemo(()=>new Map(m.rooms.map(t=>[t.id,t])),[m.rooms]),G=k.useMemo(()=>m.hours&&m.hours.length>0?m.hours:[{num:1,start:"08:00",end:"08:45"},{num:2,start:"08:55",end:"09:40"},{num:3,start:"09:50",end:"10:35"},{num:4,start:"10:55",end:"11:40"},{num:5,start:"11:50",end:"12:35"}],[m.hours]),V=k.useMemo(()=>{const t=p.yearKey,d=R[t]||{},s={},c={},l={};return Object.entries(d).forEach(([n,r])=>{const a=parseInt(n,10);Object.entries(r).forEach(([o,b])=>{Object.entries(b).forEach(([i,x])=>{(Array.isArray(x)?x:[x]).forEach(u=>{var A,z,P;if(!u)return;const g=i.split("_"),h=g[g.length-1]||"";if(u.classes&&u.classes.length>0)u.classes.forEach(j=>{var S;const y=((S=m.classes.find(ae=>ae.name===j))==null?void 0:S.id)||j;s[y]||(s[y]={}),s[y][a]||(s[y][a]={}),s[y][a][o]||(s[y][a][o]=[]),s[y][a][o].push({...u,note:h})});else if(u.className){const j=((A=m.classes.find(y=>y.name===u.className))==null?void 0:A.id)||u.className;s[j]||(s[j]={}),s[j][a]||(s[j][a]={}),s[j][a][o]||(s[j][a][o]=[]),s[j][a][o].push({...u,note:h})}const N=u.teacherAbbr;if(N){const j=((z=m.teachers.find(y=>y.abbr===N))==null?void 0:z.id)||N;c[j]||(c[j]={}),c[j][a]||(c[j][a]={}),c[j][a][o]||(c[j][a][o]=[]),c[j][a][o].push({...u,note:h})}if(h){const j=((P=m.rooms.find(y=>y.name===h))==null?void 0:P.id)||h;l[j]||(l[j]={}),l[j][a]||(l[j][a]={}),l[j][a][o]||(l[j][a][o]=[]),l[j][a][o].push({...u,note:h})}})})})}),{classes:s,teachers:c,rooms:l}},[R,p.yearKey,m.classes,m.teachers,m.rooms]),Xe=()=>{window.print()},et=()=>{const t=Ee,d=Math.max(...t.map(l=>l.cols.length),1),s=Math.min(1,Math.max(.45,12/d));let c="";return[0,1,2,3,4].forEach(l=>{let n="";t.forEach(r=>{const a=r.cols.length,o=He(r.cols,p.buildings),b=Be(r.cols);let i="110px",x="8px",f="8px",u="10px",g="9px",h="8.5px",N="12px",A="8.5px",z=!0,P="130px";a>24?(i="45px",x="3px 1px",f="3px 1px",u="7.5px",g="7px",h="6.5px",N="8px",z=!1,P="50px"):a>16?(i="65px",x="4px 2px",f="4px 2px",u="8.5px",g="8px",h="7.5px",N="9.5px",z=!1,P="75px"):a>10?(i="85px",x="6px 3px",f="6px 3px",u="9px",g="8.5px",h="8px",N="11px",A="7.5px",P="100px"):a>6&&(i="100px",x="8px 4px",f="8px 4px",u="9.5px",g="9px",h="8px",N="12px",A="8px",P="115px");let j="";G.forEach(y=>{const S=G.findIndex(O=>O.num===y.num);let ae="";r.cols.forEach(O=>{var Re,Oe,Te;let _=[];if($==="etap1")Object.entries(m.lessons).forEach(([T,q])=>{var We,Ge,Ke;const ce=T.split("|"),H=ce[0],pe=parseInt(ce[1],10),at=parseInt(ce[2],10);if(pe===l&&at===S){const J=m.assignments.find(xe=>xe.id===q.assignmentId);if(J){const xe=m.rooms.find(je=>je.id===J.roomId);if(J.roomId===O.room.id||xe&&xe.name.toLowerCase().trim()===O.room.num.toLowerCase().trim()){const je=((We=Y.get(J.subjectId))==null?void 0:We.name)||"Przedmiot",ot=((Ge=te.get(H))==null?void 0:Ge.name)||"Klasa",rt=J.teacherId?(Ke=re.get(J.teacherId))==null?void 0:Ke.abbr:"";_.push({subject:je,className:ot,teacherAbbr:rt})}}}});else{const T=Ye(O),q=(Te=(Oe=(Re=R[p.yearKey])==null?void 0:Re[l])==null?void 0:Oe[y.num])==null?void 0:Te[T];(Array.isArray(q)?q:q?[q]:[]).forEach(H=>{var pe;H&&_.push({subject:H.subject,className:H.className||((pe=H.classes)==null?void 0:pe.join("+"))||"Klasa",teacherAbbr:H.teacherAbbr})})}let de="-";_.length>0&&(de=_.map(T=>`
                <div style="margin-bottom: 4px; line-height: 1.15;">
                  <span style="font-weight: 900; background-color: #fef3c7; border: 1px solid #fde68a; padding: 1px 4px; border-radius: 4px; font-size: ${u}; display: inline-block;">
                    ${v(T.className)}
                  </span>
                  <div style="font-size: ${g}; font-weight: bold; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${P}; margin-top: 1px;" title="${v(T.subject)}">
                    ${v(T.subject)}
                  </div>
                  ${T.teacherAbbr?`
                    <span style="background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; padding: 1px 3px; border-radius: 3px; font-size: ${h}; font-weight: bold; display: inline-block; margin-top: 1px;">
                      ${v(T.teacherAbbr)}
                    </span>`:""}
                </div>
              `).join("")),ae+=`
              <td style="border: 1px solid #cbd5e1; padding: ${f}; text-align: center; vertical-align: top; background: #fff; min-height: 40px;">
                ${de}
              </td>
            `}),j+=`
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-family: monospace; background-color: #f8fafc; font-weight: bold; font-size: 10px; width: 70px;">
                <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v(y.num)}</div>
                <div style="font-size: 8px; color: #64748b; margin-top: 1px;">${v(y.start)}-${v(y.end)}</div>
              </td>
              ${ae}
            </tr>
          `}),n+=`
          <div class="category-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px;">
            <div style="background-color: #f1f5f9; border-left: 4px solid #0f172a; padding: 6px 10px; margin-bottom: 8px; font-weight: bold; font-size: 11px; color: #1e293b; display: flex; align-items: center; gap: 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
              <span style="font-size: 13px;">${r.icon}</span>
              <span style="letter-spacing: 0.03em;">${v(r.name.toUpperCase())} (Sal: ${a})</span>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 12px; table-layout: fixed;">
              <thead>
                <!-- Floor level headers row -->
                <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 900; width: 70px; color: #1e293b;">
                    Lekcja / Godz
                  </th>
                  ${o.map(y=>`
                    <th colspan="${y.span}" style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 10px; font-weight: bold; background-color: #f8fafc; color: #334155;">
                      📍 ${v(Ue(y.name,y.buildingName))}
                    </th>
                  `).join("")}
                </tr>
                <!-- Segment level headers row -->
                <tr style="background-color: #f1f5f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                  <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; font-size: 9px; font-weight: 500; background-color: #f8fafc; color: #64748b;">
                    -
                  </th>
                  ${b.map(y=>`
                    <th colspan="${y.span}" style="border: 1px solid #cbd5e1; padding: 3px; text-align: center; font-size: 9px; font-weight: bold; background-color: #ffffff; color: #64748b; text-transform: uppercase;">
                      🧩 ${v(y.name)}
                    </th>
                  `).join("")}
                </tr>
                <!-- Room level headers row -->
                <tr style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 900; width: 70px; color: #1e293b;">
                    Godzina
                  </th>
                  ${r.cols.map(y=>{const S=y.room.sub||"sala ogólna";return`
                      <th style="border: 1px solid #cbd5e1; padding: ${x}; text-align: center; font-size: 11px; font-weight: 950; min-width: ${i}; color: #020617;">
                        <span style="font-family: monospace; font-size: ${N}; display: block;">🚪 ${v(y.room.num)}</span>
                        ${z?`<span style="font-size: ${A}; color: #475569; font-weight: 500; display: block; margin-top: 1px; text-transform: lowercase;">(${v(S)})</span>`:""}
                      </th>
                    `}).join("")}
                </tr>
              </thead>
              <tbody>
                ${j}
              </tbody>
            </table>
          </div>
        `}),c+=`
        <div class="day-sheet" style="page-break-after: always; margin-bottom: 30px;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 10px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="font-size: 12px; font-weight: 950; letter-spacing: 0.05em;">
              📅 ${v(M[l].toUpperCase())} — PŁACHTA OBŁOŻENIA GABINETÓW
            </span>
            <span style="font-size: 9px; font-weight: bold; font-family: monospace; opacity: 0.85;">
              Wydruk podzielony na kategorie (Razem sal: ${Se.length})
            </span>
          </div>

          ${n}
        </div>
      `}),`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1024, initial-scale=0.85, shrink-to-fit=no">
        <title>Płachta Gabinetów - SalePlan Pro</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            color: #0f172a;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 24px;
            transform-origin: top left;
          }
          .header-title h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.02em;
          }
          .header-title p {
            margin: 4px 0 0 0;
            font-size: 11px;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-info {
            text-align: right;
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
            font-weight: bold;
            line-height: 1.4;
          }
          .no-print-bar {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 12px 24px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }
          .btn-print {
            background-color: #2563eb;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
          }
          .btn-print:hover {
            background-color: #1d4ed8;
          }
          .btn-close {
            background-color: #f1f5f9;
            color: #334155;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          .btn-close:hover {
            background-color: #e2e8f0;
          }
          
          .content {
            transform-origin: top left;
          }
          
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              background-color: #ffffff !important;
              padding: 0 !important;
            }
            .day-sheet {
              page-break-after: always !important;
              break-after: page !important;
              margin-bottom: 0 !important;
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
            <span style="font-weight: 900; font-size: 13px; color: #020617;">PODGLĄD WYDRUKU PŁACHTY GABINETÓW</span>
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
            <h1>PŁACHTA MATRYCOWA OBŁOŻENIA GABINETÓW</h1>
            <p>${v(p.school.name)} — Rok szkolny ${v(p.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            WERSJA: ${$==="etap1"?"PLAN BAZOWY KLAS (ETAP 1)":"PLAN PRZYDZIAŁU SAL (ETAP 2)"}<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString("pl-PL")} o ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div class="content">
          ${c}
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
    `},ye=()=>{try{const t=et(),d=window.open("","_blank","noopener");d?(d.document.write(t),d.document.close()):B(!0)}catch(t){console.error(t),B(!0)}},tt=()=>{const t=p.dyzury.miejsca,d=p.dyzury.przerwy,s=Math.min(1,Math.max(.45,8/Math.max(t.length,1)));let c="";return[0,1,2,3,4].forEach(l=>{let n="";d.forEach(r=>{let a="";t.forEach(o=>{const b=`${o.id}|${l}|${r.num}`,i=p.dyzury.harmonogram[b],x=i!=null&&i.teacherAbbr?p.teachers.find(u=>u.abbr===i.teacherAbbr):null;let f="-";i!=null&&i.teacherAbbr&&(f=`
              <div style="font-weight: 900; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 4px 8px; border-radius: 6px; font-size: 11px; display: inline-block; min-width: 45px; text-align: center;">
                ${v(i.teacherAbbr)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 3px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: auto; margin-right: auto;" title="${x?v(`${x.first} ${x.last}`):""}">
                ${x?`${v(x.first.slice(0,1))}. ${v(x.last)}`:"Dyżur"}
              </div>
            `),a+=`
            <td style="border: 1px solid #cbd5e1; padding: 10px 6px; text-align: center; vertical-align: middle; background: #fff;">
              ${f}
            </td>
          `}),n+=`
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; background-color: #f8fafc; font-weight: bold; font-size: 10.5px; width: 140px;">
              <div style="font-size: 11px; font-weight: 900; color: #0f172a;">${v(r.name||`Przerwa ${r.num}`)}</div>
              <div style="font-size: 8.5px; color: #64748b; font-weight: bold; margin-top: 2px; font-family: monospace;">⏱️ ${v(r.start)} - ${v(r.end)}</div>
            </td>
            ${a}
          </tr>
        `}),c+=`
        <div class="day-section" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 32px;">
          <div style="background-color: #0f172a; color: #fff; padding: 8px 14px; margin-bottom: 12px; font-weight: 900; font-size: 11.5px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
            <span style="letter-spacing: 0.05em; text-transform: uppercase;">📅 ${v(M[l])} — HARMONOGRAM DYŻURÓW</span>
            <span style="font-size: 8.5px; font-family: monospace; font-weight: bold; opacity: 0.8; text-transform: uppercase;">PODZIAŁ NA REJONY / MIEJSCA DYŻUROWAŃ</span>
          </div>

          ${t.length===0?`
            <p style="font-size: 11px; color: #64748b; font-style: italic; padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; background: #fafafa;">Brak zdefiniowanych miejsc dyżurowania.</p>
          `:`
            <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 900; color: #334155; width: 140px;">PRZERWA / GODZINA</th>
                  ${t.map(r=>`
                    <th style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; font-size: 10.5px; font-weight: 900; color: #1e293b; background-color: #f8fafc;">
                      <div style="font-weight: 900; text-transform: uppercase; color: #0f172a; font-size: 10.5px;">📍 ${v(r.name)}</div>
                      ${r.floor?`<div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${v(r.floor)}</div>`:""}
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
            <p>${v(p.school.name)} — Rok szkolny ${v(p.yearLabel)}</p>
          </div>
          <div class="meta-info">
            SYSTEM GENERACYJNY SalePlan Pro<br>
            MODUŁ DYŻURÓW SZKOLNYCH<br>
            DATA GENEROWANIA: ${new Date().toLocaleDateString("pl-PL")} o ${new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>

        <div class="content">
          ${c}
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
    `},st=()=>{try{const t=tt(),d=window.open("","_blank","noopener");d?(d.document.write(t),d.document.close()):B(!0)}catch(t){console.error(t),B(!0)}},ne=k.useMemo(()=>L==="all"?m.classes:m.classes.filter(t=>t.id===L),[m.classes,L]),le=k.useMemo(()=>C==="all"?m.teachers:m.teachers.filter(t=>t.id===C),[m.teachers,C]),Se=k.useMemo(()=>D==="all"?m.rooms:m.rooms.filter(t=>t.id===D),[m.rooms,D]),ie=k.useMemo(()=>{const t=nt(p.floors),d=D==="all"?t:t.filter(a=>{const o=(a.room.num||"").toLowerCase().trim(),b=m.rooms.find(i=>i.name.toLowerCase().trim()===o);return b&&b.id===D}),s=[],c=[],l=[],n=new Map(m.rooms.map(a=>[a.name.toLowerCase().trim(),a]));d.forEach(a=>{const o=(a.room.num||"").toLowerCase().trim(),b=n.get(o),i=p.buildings[a.floor.buildingIdx],x=(b==null?void 0:b.type)==="indywidualne",f=(b==null?void 0:b.type)==="sport"||(i==null?void 0:i.multi)===!0;x?c.push(a):f?l.push(a):s.push(a)});const r=(a,o)=>{const b=a.room.num||"",i=o.room.num||"";return b.localeCompare(i,void 0,{numeric:!0,sensitivity:"base"})};return s.sort(r),c.sort(r),l.sort(r),{main:s,individual:c,sport:l}},[p.floors,p.buildings,m.rooms,D]),Ee=k.useMemo(()=>[{id:"main",name:"Budynek Główny",icon:"🏢",cols:ie.main},{id:"individual",name:"Nauczanie Indywidualne",icon:"🗣️",cols:ie.individual},{id:"sport",name:"Sale Sportowe",icon:"🏆",cols:ie.sport}].filter(t=>t.cols.length>0),[ie]);if(me)return e.jsxs("div",{id:"weekly-print-overlay",className:"fixed inset-0 bg-slate-100/90 backdrop-blur-md z-[9999] overflow-y-auto p-4 md:p-8 font-sans text-slate-800",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:`
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
              size: ${X};
              margin: 10mm;
            }
          }
        `}}),e.jsxs("div",{className:"no-print bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 mb-6 max-w-7xl mx-auto shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("span",{className:"p-2 bg-slate-800 rounded-lg text-indigo-400",children:e.jsx(E,{size:20})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-slate-400 block uppercase font-bold tracking-tight",children:"Tryb przygotowania do druku"}),e.jsxs("h3",{className:"text-sm font-black uppercase text-white leading-tight",children:["Podgląd Tygodniowego Planu • ",w==="classes"?"Oddziały":"Nauczyciele"]})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>ve("portrait"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${X==="portrait"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Pionowo (A4)"}),e.jsx("button",{onClick:()=>ve("landscape"),className:`px-3 py-1 text-[11px] font-bold rounded-md transition ${X==="landscape"?"bg-indigo-600 text-white":"text-slate-400 hover:text-white"}`,children:"Poziomo (A4)"})]}),w==="classes"?e.jsxs("select",{value:L,onChange:t=>W(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały"}),m.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]}):e.jsxs("select",{value:C,onChange:t=>K(t.target.value),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele"}),m.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first]},t.id))]}),e.jsxs("button",{onClick:()=>window.print(),className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(E,{size:13})," Drukuj teraz (Ctrl+P)"]}),e.jsx("button",{onClick:()=>ke(!1),className:"px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition select-none cursor-pointer",children:"Zamknij podgląd"})]})]}),e.jsx("div",{className:"max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:w==="classes"?ne.map((t,d)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${d<ne.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN LEKCJI • KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[p.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",p.yearLabel," • ",$==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:G.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{var a;let r=[];if($==="etap1"){const o=`${t.id}|${n}|${c}`,b=m.lessons[o];if(b){const i=m.assignments.find(x=>x.id===b.assignmentId);if(i){const x=((a=Y.get(i.subjectId))==null?void 0:a.name)||"Inny",f=i.teacherId?re.get(i.teacherId):null,u=i.roomId?se.get(i.roomId):null;r.push({subject:x,teacherAbbr:f==null?void 0:f.abbr,roomName:u==null?void 0:u.name})}}}else(((V.classes[t.id]||{})[n]||{})[l]||[]).forEach(x=>{r.push({subject:x.subject,teacherAbbr:x.teacherAbbr,roomName:x.note})});return e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:r.length>0?e.jsx("div",{className:"space-y-1.5",children:r.map((o,b)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:o.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[o.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:o.teacherAbbr}),o.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",o.roomName]})]})]},b))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id)):le.map((t,d)=>e.jsxs("div",{className:`print-card pb-8 border-b border-slate-200 last:border-0 ${d<le.length-1?"page-break mb-12":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsxs("h2",{className:"text-xl font-black text-slate-950",children:["TYGODNIOWY PLAN NAUCZYCIELA • ",t.last.toUpperCase()," ",t.first.toUpperCase()," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-bold uppercase",children:[p.school.name," • Plan lekcji"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:["Rok szkolny: ",p.yearLabel," • ",$==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2.5 text-center text-[10px]",children:"Nr / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2.5 text-center text-[10px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:G.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"bg-white",children:[e.jsxs("td",{className:"border border-slate-300 p-2 py-2.5 font-mono text-center text-[10px] bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-200 font-semibold leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{let r=[];return $==="etap1"?Object.entries(m.lessons).forEach(([a,o])=>{var u,g;const b=a.split("|"),i=b[0],x=parseInt(b[1],10),f=parseInt(b[2],10);if(x===n&&f===c){const h=m.assignments.find(N=>N.id===o.assignmentId);if(h&&h.teacherId===t.id){const N=((u=Y.get(h.subjectId))==null?void 0:u.name)||"Inny",A=((g=te.get(i))==null?void 0:g.name)||"Inna",z=h.roomId?se.get(h.roomId):null;r.push({subject:N,className:A,roomName:z==null?void 0:z.name})}}}):(((V.teachers[t.id]||{})[n]||{})[l]||[]).forEach(i=>{var x;r.push({subject:i.subject,className:i.className||((x=i.classes)==null?void 0:x.join("+"))||"Klasa",roomName:i.note})}),e.jsx("td",{className:"border border-slate-300 p-2.5 align-middle text-center min-h-[50px] bg-white",children:r.length>0?e.jsx("div",{className:"space-y-1.5",children:r.map((a,o)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-black text-slate-900 block tracking-tight text-[10.5px]",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-extrabold mt-1",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1 rounded",children:["sala: ",a.roomName]})]})]},o))}):e.jsx("span",{className:"text-[9px] text-slate-200 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id))})]});const Le=t=>!t||t.length===0?null:t.map((d,s)=>{var r;const c=d.className||((r=d.classes)==null?void 0:r.join(", "))||"",l=d.subject||"",n=d.note||"";return e.jsxs("div",{className:"text-[10px] font-semibold text-slate-700 leading-tight",children:["📚 ",e.jsx("span",{className:"font-extrabold text-slate-900",children:l})," (kl. ",c,", s. ",n,")"]},s)});return e.jsxs("div",{className:"flex-1 overflow-y-auto px-6 py-6 bg-slate-50 relative print:p-0 print:bg-white print:overflow-visible",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 max-w-7xl mx-auto",children:[Ze&&e.jsx("div",{className:"mb-5 bg-amber-50 border border-amber-200 p-4 rounded-xl text-left",children:e.jsxs("div",{className:"flex gap-3",children:[e.jsx("span",{className:"text-xl shrink-0",children:"⚠️"}),e.jsxs("div",{children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase tracking-tight",children:"Ograniczenie zabezpieczeń przeglądarki (Praca w Ramce iFrame)"}),e.jsxs("p",{className:"text-[11px] text-amber-800 leading-normal font-semibold mt-1",children:["Aktualnie przeglądasz aplikację wewnątrz bezpiecznej ramki podglądu AI Studio. Przeglądarki internetowe **całkowicie blokują** próby uruchomienia okna drukowania (",e.jsx("code",{className:"font-mono bg-amber-100 px-1 py-0.5 rounded",children:"window.print()"}),") oraz otwierania nowych okien z wnętrza takich ramek."]}),e.jsxs("div",{className:"bg-white/80 border border-amber-200/50 rounded-lg p-2.5 mt-2.5 space-y-1.5 text-[10.5px] font-bold text-amber-950",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"1"}),e.jsxs("span",{children:["Kliknij okrągłą ikonę ze strzałką ",e.jsx("strong",{className:"font-black",children:'"Otwórz w nowej karcie"'})," w prawym górnym rogu podglądu aplikacji."]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]",children:"2"}),e.jsxs("span",{children:["W nowym oknie przycisk ",e.jsx("strong",{className:"font-black",children:'"Drukuj teraz"'})," oraz ",e.jsx("strong",{className:"font-black",children:'"Podgląd płachty sal"'})," zadziałają natychmiast!"]})]})]})]})]})}),e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"p-2 bg-blue-100 text-blue-600 rounded-lg",children:e.jsx(E,{size:20})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-sm font-black text-slate-800 uppercase tracking-tight",children:"Centrum Wydruków i Publikacji"}),e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase mt-0.5",children:"Wygodne drukowanie planów lekcji i dyżurów"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[w==="rooms"&&e.jsxs("button",{onClick:ye,className:"px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:15,className:"animate-pulse"})," Podgląd płachty sal"]}),w==="duties"&&e.jsxs("button",{onClick:()=>oe(!0),className:"px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:15,className:"animate-pulse"})," Podgląd dyżurów"]}),(w==="classes"||w==="teachers")&&e.jsxs("button",{onClick:()=>ke(!0),className:"px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-indigo-600 border-solid",title:"Generuj przejrzysty i czytelny tygodniowy plan dostosowany do wydruku z czyszczeniem interfejsu",children:[e.jsx(we,{size:15})," Generuj Tygodniowy Plan"]}),e.jsxs("button",{onClick:Xe,className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer",children:[e.jsx(E,{size:15})," Drukuj teraz (Ctrl+P)"]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Typ wydruku"}),e.jsxs("div",{className:"grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg",children:[e.jsx("button",{onClick:()=>I("classes"),className:`py-1.5 text-[11px] font-black rounded-md transition ${w==="classes"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Plan Klas"}),e.jsx("button",{onClick:()=>I("teachers"),className:`py-1.5 text-[11px] font-black rounded-md transition ${w==="teachers"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Nauczyciele"}),e.jsx("button",{onClick:()=>I("rooms"),className:`py-1.5 text-[11px] font-black rounded-md transition ${w==="rooms"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Gabinety"}),e.jsx("button",{onClick:()=>I("duties"),className:`py-1.5 text-[11px] font-black rounded-md transition ${w==="duties"?"bg-white shadow-xs text-slate-900":"text-slate-500 hover:text-slate-900"}`,children:"Dyżury"})]})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Siatka Lekcji"}),e.jsxs("select",{value:$,onChange:t=>Q(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"etap1",children:"Etap 1: Plan Klas (Siatka bazowa)"}),e.jsx("option",{value:"etap2",children:"Etap 2: Plan Sal (Przydzielone gabinety)"})]})]}),w==="classes"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Klasę"}),e.jsxs("select",{value:L,onChange:t=>W(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie oddziały (każdy na nowej stronie)"}),m.classes.map(t=>e.jsxs("option",{value:t.id,children:["Klasa ",t.name]},t.id))]})]}),w==="teachers"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Nauczyciela"}),e.jsxs("select",{value:C,onChange:t=>K(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszyscy nauczyciele (każdy na nowej stronie)"}),m.teachers.map(t=>e.jsxs("option",{value:t.id,children:[t.last," ",t.first," (",t.abbr,")"]},t.id))]})]}),w==="rooms"&&e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase",children:"Wybierz Gabinet"}),e.jsxs("select",{value:D,onChange:t=>U(t.target.value),className:"w-full h-[38px] px-3 border border-slate-200 bg-white text-xs font-semibold rounded-lg text-slate-700 outline-none",children:[e.jsx("option",{value:"all",children:"Wszystkie sale/gabinety"}),m.rooms.map(t=>e.jsxs("option",{value:t.id,children:[t.name," (",t.desc||"sala ogólna",")"]},t.id))]})]}),w==="rooms"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:ye,className:"w-full h-[38px] px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-amber-600 border-solid",children:[e.jsx(E,{size:15})," Podgląd wydruku płachty sal"]})]}),w==="duties"&&e.jsxs("div",{className:"space-y-1 flex flex-col justify-end",children:[e.jsx("label",{className:"text-[10px] text-slate-400 font-bold uppercase invisible sm:block",children:"Akcja"}),e.jsxs("button",{onClick:()=>oe(!0),className:"w-full h-[38px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",children:[e.jsx(E,{size:15})," Podgląd wydruku dyżurów"]})]})]}),w==="teachers"&&e.jsx("div",{className:"mt-5 pt-5 border-t border-slate-100 space-y-4 text-left",children:e.jsxs("div",{className:"bg-gradient-to-tr from-indigo-50/70 to-blue-50/30 border border-indigo-100 rounded-xl p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx("span",{className:"p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md font-extrabold text-xs",children:"📅"}),e.jsx("span",{className:"text-xs font-black uppercase text-indigo-900 tracking-wide",children:"Eksport tygodniowego planu zajęć do kalendarza (.ics / Google Calendar)"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 items-end",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Początek okresu (Pierwszy dzień lekcji)"}),e.jsx("input",{type:"date",value:he,onChange:t=>ze(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Koniec okresu (Ostatni dzień lekcji)"}),e.jsx("input",{type:"date",value:fe,onChange:t=>$e(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("label",{className:"text-[9px] text-slate-500 font-bold uppercase block",children:"Format tytułu wydarzenia w kalendarzu"}),e.jsxs("select",{value:ge,onChange:t=>Je(t.target.value),className:"w-full h-[36px] px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none",children:[e.jsx("option",{value:"[Przedmiot] - [Klasa] [Sala]",children:"[Przedmiot] - [Klasa] [Sala]"}),e.jsx("option",{value:"[Klasa] - [Przedmiot] [Sala]",children:"[Klasa] - [Przedmiot] [Sala]"}),e.jsx("option",{value:"[Przedmiot] ([Klasa]) (Sala: [Sala])",children:"[Przedmiot] ([Klasa]) ([Sala])"})]})]})]}),e.jsxs("div",{className:"mt-4 pt-4 border-t border-indigo-100/50 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center",children:[e.jsxs("div",{className:"text-[10px] text-slate-500 leading-relaxed max-w-xl",children:["💡 ",e.jsx("strong",{children:"Wskazówka:"})," Kliknij przycisk ",e.jsx("span",{className:"bg-white border text-indigo-700 px-1 py-0.5 rounded font-black text-[9px]",children:"Pobierz kalendarz (.ics)"})," przy konkretnym nauczycielu na liście poniżej, albo pobierz zbiorczy arkusz z kadrą za pomocą poniższych przycisków szybkiego pobierania."]}),e.jsxs("div",{className:"flex gap-2 flex-wrap w-full lg:w-auto",children:[C!=="all"&&e.jsxs("button",{onClick:()=>{const t=m.teachers.find(d=>d.id===C);t&&De(t)},className:"px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-600 border-solid",children:[e.jsx(we,{size:13})," Pobierz dla ",(Me=m.teachers.find(t=>t.id===C))==null?void 0:Me.abbr]}),e.jsxs("button",{onClick:Qe,className:"px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer border border-slate-800 border-solid",children:[e.jsx(lt,{size:13})," Wspólny plik dla KADRY"]})]})]})]})})]}),e.jsxs("div",{className:"print-container max-w-7xl mx-auto space-y-8 bg-white p-8 border border-slate-200 shadow-sm rounded-2xl print:shadow-none print:border-none print:p-0",children:[w==="classes"&&ne.map((t,d)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${d<ne.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI · KLASA ",t.name]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[p.school.name," (",p.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",$==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:G.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{var a;let r=[];if($==="etap1"){const o=`${t.id}|${n}|${c}`,b=m.lessons[o];if(b){const i=m.assignments.find(x=>x.id===b.assignmentId);if(i){const x=((a=Y.get(i.subjectId))==null?void 0:a.name)||"Inny",f=i.teacherId?re.get(i.teacherId):null,u=i.roomId?se.get(i.roomId):null;r.push({subject:x,teacherAbbr:f==null?void 0:f.abbr,roomName:u==null?void 0:u.name})}}}else(((V.classes[t.id]||{})[n]||{})[l]||[]).forEach(x=>{r.push({subject:x.subject,teacherAbbr:x.teacherAbbr,roomName:x.note})});return e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:r.length>0?e.jsx("div",{className:"space-y-1",children:r.map((o,b)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:o.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[o.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 border border-slate-200 px-1 rounded",children:o.teacherAbbr}),o.roomName&&e.jsxs("span",{className:"bg-blue-50/50 border border-blue-100 text-blue-700 px-1 rounded",children:["f. ",o.roomName]})]})]},b))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id)),w==="teachers"&&le.map((t,d)=>e.jsxs("div",{className:`print-card pb-6 border-b border-slate-200 last:border-0 ${d<le.length-1?"page-break":""}`,children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h2",{className:"text-xl font-extrabold text-slate-900",children:["PLAN LEKCJI NAUCZYCIELA: ",t.last," ",t.first," (",t.abbr,")"]}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[p.school.name," (",p.yearLabel,")"]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("button",{onClick:()=>De(t),className:"no-print px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 rounded-lg text-[10px] font-black tracking-tight leading-none transition flex items-center gap-1.5 cursor-pointer select-none border-solid",title:"Pobierz plik kalendarza (.ics) dla tego nauczyciela",children:[e.jsx(we,{size:11})," Pobierz kalendarz (.ics)"]}),e.jsxs("div",{className:"text-right text-[9px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",$==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]})]}),e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"w-20 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lp. / Godz"}),M.map(s=>e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:s},s))]})}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:G.map((s,c)=>{const l=String(s.num);return e.jsxs("tr",{className:"hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center text-[10px]",children:[e.jsx("span",{className:"font-extrabold text-slate-900",children:s.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[s.start,"-",s.end]})]}),[0,1,2,3,4].map(n=>{let r=[];return $==="etap1"?Object.entries(m.lessons).forEach(([a,o])=>{var u,g;const b=a.split("|"),i=b[0],x=parseInt(b[1],10),f=parseInt(b[2],10);if(x===n&&f===c){const h=m.assignments.find(N=>N.id===o.assignmentId);if(h&&h.teacherId===t.id){const N=((u=Y.get(h.subjectId))==null?void 0:u.name)||"Inny",A=((g=te.get(i))==null?void 0:g.name)||"Inna",z=h.roomId?se.get(h.roomId):null;r.push({subject:N,className:A,roomName:z==null?void 0:z.name})}}}):(((V.teachers[t.id]||{})[n]||{})[l]||[]).forEach(i=>{var x;r.push({subject:i.subject,className:i.className||((x=i.classes)==null?void 0:x.join("+"))||"Klasa",roomName:i.note})}),e.jsx("td",{className:"border border-slate-300 p-2 align-top text-center min-h-[45px]",children:r.length>0?e.jsx("div",{className:"space-y-1",children:r.map((a,o)=>e.jsxs("div",{className:"text-[10px]",children:[e.jsx("span",{className:"font-black text-slate-950 block",children:a.subject}),e.jsxs("div",{className:"flex items-center justify-center gap-1.5 text-[8.5px] text-slate-500 font-bold mt-0.5",children:[e.jsx("span",{className:"bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 px-1 rounded",children:a.className}),a.roomName&&e.jsxs("span",{className:"bg-blue-50 border border-blue-100 text-blue-700 px-1.5 rounded",children:["s. ",a.roomName]})]})]},o))}):e.jsx("span",{className:"text-[9px] text-slate-300 font-bold font-mono",children:"-"})},n)})]},s.num)})})]})]},t.id)),w==="rooms"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN MATRYCOWY GABINETÓW / SAL LEKCYJNYCH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[p.school.name," (",p.yearLabel,")"]})]}),e.jsxs("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:["Generowane przez SalePlan Pro · ",$==="etap1"?"Wersja Plan Klas":"Wersja Plan Sal"]})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase no-print",children:"Zbiorcza płachta obłożenia gabinetów podzielona na poszczególne dni tygodnia. Filtrowanie pozwala na ograniczenie kolumn płachty."}),e.jsxs("div",{className:"no-print bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",children:[e.jsxs("div",{className:"space-y-1 text-left",children:[e.jsx("span",{className:"text-xs font-black text-amber-900 block uppercase",children:"✨ Dedykowany Wydruk Płachty Dyrektorskiej"}),e.jsx("p",{className:"text-[11px] text-amber-700 leading-normal font-medium max-w-3xl",children:"Standardowy wydruk w ramce przeglądarki może ucinać szeroką tabelę gabinetów. Nasz inteligentny generator otwiera dedykowany, czysty arkusz HTML zoptymalizowany pod układ poziomy (A4 landscape) bez zbędnych elementów deweloperskich i automatycznie uruchamia okno dialogowe drukarki."})]}),e.jsxs("button",{onClick:ye,className:"shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition select-none cursor-pointer",children:[e.jsx(E,{size:14,className:"animate-pulse"})," Podgląd i Druk Płachty (A4 Poziomo)"]})]}),Se.length===0?e.jsx("p",{className:"text-xs text-slate-400 p-4 text-center",children:"Brak gabinetów do wyświetlenia w wybranym filtrze."}):e.jsx("div",{className:"space-y-12",children:[0,1,2,3,4].map(t=>e.jsxs("div",{className:"page-break last:pb-0 pb-2",children:[e.jsxs("div",{className:"bg-slate-900 text-white border border-slate-800 px-4 py-2.5 rounded-xl flex justify-between items-center mb-4 print:bg-slate-100 print:text-slate-900 print:border-slate-300",children:[e.jsxs("span",{className:"text-xs font-black uppercase tracking-wide",children:["📅 ",M[t]," — PŁACHTA OBŁOŻENIA GABINETÓW"]}),e.jsx("span",{className:"text-[9px] uppercase font-bold font-mono text-slate-400 print:text-slate-500",children:"Podział na kategorie"})]}),e.jsx("div",{className:"space-y-6",children:Ee.map(d=>{const s=He(d.cols,p.buildings),c=Be(d.cols);return e.jsxs("div",{className:"border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40 p-3 shadow-sm",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2 px-1",children:[e.jsx("span",{className:"text-sm",children:d.icon}),e.jsxs("h4",{className:"text-[11px] font-black text-slate-700 uppercase tracking-wider",children:[d.name," (",d.cols.length,")"]})]}),e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs text-left border border-slate-300 min-w-[600px] bg-white rounded-lg",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"w-24 border border-slate-300 p-2 text-center text-[10.5px]",children:"Lekcja / Godz"}),s.map((l,n)=>e.jsxs("th",{colSpan:l.span,className:"border border-slate-300 p-2 text-center text-[10px] bg-slate-50 font-bold text-slate-700",children:["📍 ",Ue(l.name,l.buildingName)]},n))]}),e.jsxs("tr",{className:"bg-white uppercase font-black text-slate-500 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-1.5 text-center text-[9px] bg-slate-50 font-medium text-slate-400",children:"-"}),c.map((l,n)=>e.jsxs("th",{colSpan:l.span,className:"border border-slate-300 p-1.5 text-center text-[9px] bg-white text-slate-500 uppercase font-semibold",children:["🧩 ",l.name]},n))]}),e.jsxs("tr",{className:"bg-slate-50 uppercase font-black text-slate-800",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-center text-[10.5px]",children:"Godzina"}),d.cols.map((l,n)=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10.5px] min-w-[110px]",children:[e.jsxs("span",{className:"font-mono text-[11px] block text-slate-900",children:["🚪 ",l.room.num]}),e.jsxs("span",{className:"block text-[8px] text-slate-500 font-medium normal-case truncate max-w-[140px] mx-auto",children:["(",l.room.sub||"sala ogólna",")"]})]},n))]})]}),e.jsx("tbody",{className:"divide-y divide-slate-200",children:G.map((l,n)=>(String(l.num),e.jsxs("tr",{className:"hover:bg-slate-50/40",children:[e.jsxs("td",{className:"border border-slate-300 p-2 font-mono text-center bg-slate-50/50",children:[e.jsx("span",{className:"font-extrabold text-slate-900 text-[11px]",children:l.num}),e.jsxs("span",{className:"block text-[8px] text-slate-400 leading-none mt-0.5",children:[l.start,"-",l.end]})]}),d.cols.map((r,a)=>{var b,i,x;let o=[];if($==="etap1")Object.entries(m.lessons).forEach(([f,u])=>{var z,P,j;const g=f.split("|"),h=g[0],N=parseInt(g[1],10),A=parseInt(g[2],10);if(N===t&&A===n){const y=m.assignments.find(S=>S.id===u.assignmentId);if(y){const S=m.rooms.find(O=>O.id===y.roomId);if(y.roomId===r.room.id||S&&S.name.toLowerCase().trim()===r.room.num.toLowerCase().trim()){const O=((z=Y.get(y.subjectId))==null?void 0:z.name)||"Przedmiot",_=((P=te.get(h))==null?void 0:P.name)||"Klasa",de=y.teacherId?(j=re.get(y.teacherId))==null?void 0:j.abbr:"";o.push({subject:O,className:_,teacherAbbr:de})}}}});else{const f=Ye(r),u=(x=(i=(b=R[p.yearKey])==null?void 0:b[t])==null?void 0:i[l.num])==null?void 0:x[f];(Array.isArray(u)?u:u?[u]:[]).forEach(h=>{var N;h&&o.push({subject:h.subject,className:h.className||((N=h.classes)==null?void 0:N.join("+"))||"Klasa",teacherAbbr:h.teacherAbbr})})}return e.jsx("td",{className:"border border-slate-300 p-1.5 align-top text-center min-h-[50px] bg-white",children:o.length>0?e.jsx("div",{className:"space-y-1",children:o.map((f,u)=>e.jsxs("div",{className:"text-[10px] leading-tight",children:[e.jsx("span",{className:"font-extrabold text-slate-900 block text-[10.5px] bg-amber-100/70 border border-amber-200/80 rounded px-1.5 py-0.5 inline-block mb-0.5",children:f.className}),e.jsx("span",{className:"text-[9px] text-slate-700 block font-bold truncate max-w-[100px] mx-auto",title:f.subject,children:f.subject}),f.teacherAbbr&&e.jsx("span",{className:"bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-1.5 rounded text-[8.5px] font-bold inline-block mt-0.5",children:f.teacherAbbr})]},u))}):e.jsx("span",{className:"text-[10px] text-slate-300 font-bold font-mono",children:"-"})},a)})]},l.num)))})]})})]},d.id)})})]},t))})]}),w==="duties"&&e.jsxs("div",{className:"print-card pb-6",children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-2 mb-4",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"text-xl font-extrabold text-slate-900",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-semibold uppercase",children:[p.school.name," (",p.yearLabel,")"]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase font-mono",children:"Generowane przez SalePlan Pro · Moduł Dyżurów"})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mb-6 font-bold uppercase",children:"Wydruk harmonogramu dyżurów przydzielonych w poszczególnych rejonach (miejscach) szkoły dla przerw międzylekcyjnych."}),e.jsx("div",{className:"space-y-8",children:[0,1,2,3,4].map(t=>{const d=p.dyzury.miejsca.some(s=>p.dyzury.przerwy.some(c=>{var n;const l=`${s.id}|${t}|${c.num}`;return!!((n=p.dyzury.harmonogram[l])!=null&&n.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-4 bg-slate-50/50 break-inside-avoid",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5",children:["📅 ",M[t]]}),d?p.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("table",{className:"w-full text-xs border-collapse border border-slate-300",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"border border-slate-300 p-2 text-left text-[10px] w-48 bg-slate-50",children:"Godzina / Przerwa"}),p.dyzury.miejsca.map(s=>e.jsxs("th",{className:"border border-slate-300 p-2 text-center text-[10px] min-w-[110px] bg-slate-50",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:p.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-200 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"border border-slate-300 p-2.5 font-mono text-[9px] text-left",children:[e.jsx("span",{className:"font-extrabold text-slate-800",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-0.5",children:["⏱️ ",s.start," - ",s.end]})]}),p.dyzury.miejsca.map(c=>{const l=`${c.id}|${t}|${s.num}`,n=p.dyzury.harmonogram[l],r=n!=null&&n.teacherAbbr?p.teachers.find(a=>a.abbr===n.teacherAbbr):null;return e.jsx("td",{className:"border border-slate-300 p-2 text-center align-middle",children:n!=null&&n.teacherAbbr?e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-900 text-white rounded px-2.5 py-1 text-[10px] font-mono font-black shadow-xs tracking-wider uppercase inline-block print:bg-slate-100 print:text-slate-900 print:border print:border-slate-300",children:n.teacherAbbr}),e.jsx("span",{className:"block text-[8.5px] text-slate-400 font-bold truncate max-w-[100px] mt-1 print:text-slate-500",children:r?`${r.first.slice(0,1)}. ${r.last}`:"Dyżur"})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},c.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-1.5",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})]}),Ve&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[9999] no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl max-w-7xl w-full h-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white p-5 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl",children:e.jsx(E,{size:22,className:"animate-pulse"})}),e.jsxs("div",{className:"text-left",children:[e.jsx("span",{className:"text-[10px] text-emerald-400 block uppercase font-black tracking-wider",children:"Dynamiczny Podgląd i Weryfikacja • SchedData"}),e.jsx("h3",{className:"text-lg font-black uppercase text-white leading-tight",children:"Harmonogram Dyżurów Nauczycielskich"})]})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-wrap",children:[e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Dzień Tygodnia"}),e.jsxs("select",{value:ue,onChange:t=>{const d=t.target.value;qe(d==="all"?"all":parseInt(d,10))},className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"all",children:"Wszystkie dni tygodnia"}),[0,1,2,3,4].map(t=>e.jsx("option",{value:t,children:M[t]},t))]})]}),e.jsxs("div",{className:"flex flex-col text-left",children:[e.jsx("label",{className:"text-[9px] font-bold uppercase text-slate-400 mb-1",children:"Skala (Zoom)"}),e.jsxs("select",{value:be,onChange:t=>_e(parseFloat(t.target.value)),className:"bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:outline-none cursor-pointer",children:[e.jsx("option",{value:"0.7",children:"70% (Gęsty/Kompaktowy)"}),e.jsx("option",{value:"0.8",children:"80%"}),e.jsx("option",{value:"0.85",children:"85%"}),e.jsx("option",{value:"0.9",children:"90%"}),e.jsx("option",{value:"1.0",children:"100% (Standardowy)"}),e.jsx("option",{value:"1.1",children:"110% (Powiększony)"})]})]}),e.jsx("div",{className:"flex items-end h-full",children:e.jsxs("button",{onClick:st,className:"h-[36px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition select-none cursor-pointer border border-emerald-600 border-solid",title:"Otwórz czysty, zoptymalizowany podział A4 landscape do drukowania lub zapisu do PDF",children:[e.jsx(E,{size:15})," Drukuj / Generuj PDF"]})}),e.jsx("div",{className:"flex items-end h-full",children:e.jsx("button",{onClick:()=>oe(!1),className:"h-[36px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center",children:e.jsx(it,{size:18})})})]})]}),e.jsx("div",{className:"p-6 bg-slate-100 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-300",children:e.jsxs("div",{className:"mx-auto bg-white p-8 border border-slate-200 shadow-md rounded-2xl space-y-8",style:{transform:`scale(${be})`,transformOrigin:"top center",width:`${100/be}%`,transition:"transform 0.15s ease-out, width 0.15s ease-out"},children:[e.jsxs("div",{className:"flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-4",children:[e.jsxs("div",{className:"text-left",children:[e.jsx("h2",{className:"text-xl font-black text-slate-950",children:"PLAN I HARMONOGRAM DYŻURÓW NAUCZYCIELSKICH"}),e.jsxs("p",{className:"text-xs text-slate-500 font-extrabold uppercase",children:[p.school.name," • Rok szkolny ",p.yearLabel]})]}),e.jsx("div",{className:"text-right text-[10px] text-slate-400 font-bold uppercase",children:"Generowane dynamicznie • Weryfikacja planu lekcji (SchedData)"})]}),e.jsx("div",{className:"space-y-8 text-left",children:[0,1,2,3,4].filter(t=>ue==="all"||ue===t).map(t=>{const d=p.dyzury.miejsca.some(s=>p.dyzury.przerwy.some(c=>{var n;const l=`${s.id}|${t}|${c.num}`;return!!((n=p.dyzury.harmonogram[l])!=null&&n.teacherAbbr)}));return e.jsxs("div",{className:"border border-slate-200 rounded-2xl p-5 bg-slate-50/50 break-inside-avoid shadow-sm",children:[e.jsxs("h3",{className:"text-xs font-black text-slate-950 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4 flex items-center justify-between",children:[e.jsxs("span",{children:["📅 ",M[t]]}),e.jsxs("span",{className:"text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider",children:[p.dyzury.miejsca.length," Miejsc • ",p.dyzury.przerwy.length," Przerw"]})]}),d?p.dyzury.miejsca.length===0?e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak zdefiniowanych miejsc dyżurowania."}):e.jsx("div",{className:"overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 border border-slate-200 rounded-xl shadow-xs",children:e.jsxs("table",{className:"w-full text-xs border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-100 uppercase font-black text-slate-800 border-b border-slate-300",children:[e.jsx("th",{className:"p-3 text-left text-[10px] w-48 bg-slate-50 font-black border-r border-slate-200",children:"Godzina / Przerwa"}),p.dyzury.miejsca.map(s=>e.jsxs("th",{className:"p-3 text-center text-[10px] min-w-[200px] bg-slate-50 font-black border-r border-slate-200 last:border-r-0",children:[e.jsxs("span",{className:"block text-slate-900 font-black",children:["📍 ",s.name]}),s.floor&&e.jsx("span",{className:"block text-[8px] text-slate-500 font-bold uppercase mt-0.5",children:s.floor})]},s.id))]})}),e.jsx("tbody",{children:p.dyzury.przerwy.map(s=>e.jsxs("tr",{className:"bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50",children:[e.jsxs("td",{className:"p-3 font-mono text-[9px] text-left border-r border-slate-200 font-semibold bg-slate-50/30",children:[e.jsx("span",{className:"font-extrabold text-slate-800 block text-xs",children:s.name||`Przerwa ${s.num}`}),e.jsxs("span",{className:"block text-slate-400 font-bold mt-1",children:["⏱️ ",s.start," - ",s.end]})]}),p.dyzury.miejsca.map(c=>{var u;const l=`${c.id}|${t}|${s.num}`,n=p.dyzury.harmonogram[l],r=n!=null&&n.teacherAbbr?p.teachers.find(g=>g.abbr===n.teacherAbbr):null,a=(r==null?void 0:r.id)||(n==null?void 0:n.teacherAbbr)||"",o=a?((u=V.teachers[a])==null?void 0:u[t])||{}:{},b=a?o[String(s.num)]||[]:[],i=a?o[String(s.num+1)]||[]:[],x=a?Object.values(o).some(g=>Array.isArray(g)&&g.length>0):!1,f=p.dyzury.miejsca.filter(g=>g.id!==c.id).map(g=>{const h=`${g.id}|${t}|${s.num}`;return{placeName:g.name,entry:p.dyzury.harmonogram[h]}}).filter(g=>{var h;return((h=g.entry)==null?void 0:h.teacherAbbr)===(n==null?void 0:n.teacherAbbr)});return e.jsx("td",{className:"p-3 text-center align-middle border-r border-slate-200 last:border-r-0",children:n!=null&&n.teacherAbbr?e.jsxs("div",{className:"flex flex-col items-center justify-center space-y-2",children:[e.jsxs("div",{className:"inline-flex flex-col items-center justify-center",children:[e.jsx("span",{className:"bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-3 py-1 text-xs font-mono font-black shadow-xs tracking-wider uppercase inline-block",children:n.teacherAbbr}),e.jsx("span",{className:"block text-[9px] text-slate-600 font-bold truncate max-w-[150px] mt-1",children:r?`${r.first} ${r.last}`:"Dyżur"})]}),e.jsxs("div",{className:"w-full mt-2 pt-2 border-t border-slate-100 text-left space-y-1 bg-slate-50/50 p-2 rounded-lg",children:[e.jsx("div",{className:"text-[8px] text-slate-400 uppercase font-black tracking-wider mb-1",children:"Weryfikacja lekcji:"}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Przed przerwą: "}),b.length>0?Le(b):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]}),e.jsxs("div",{className:"text-[9px]",children:[e.jsx("span",{className:"text-slate-400 font-bold",children:"Po przerwie: "}),i.length>0?Le(i):e.jsx("span",{className:"text-slate-400 font-medium italic",children:"Brak lekcji"})]})]}),(f.length>0||!x)&&e.jsxs("div",{className:"w-full space-y-1",children:[f.length>0&&e.jsxs("div",{className:"bg-red-50 text-red-700 border border-red-200 rounded p-1 text-[8.5px] font-bold text-left",children:["🚨 Kolizja: Jednoczesny dyżur w rejonie: ",f.map(g=>g.placeName).join(", ")]}),!x&&e.jsx("div",{className:"bg-amber-50 text-amber-700 border border-amber-200 rounded p-1 text-[8.5px] font-bold text-left",children:"⚠️ Brak innych lekcji w tym dniu!"})]})]}):e.jsx("span",{className:"text-slate-300 font-bold",children:"-"})},c.id)})]},s.num))})]})}):e.jsx("p",{className:"text-[10px] text-slate-400 italic py-2",children:"Brak przydzielonych dyżurów na ten dzień."})]},t)})})]})}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0",children:[e.jsx("span",{className:"text-xs text-slate-400 font-semibold uppercase",children:"Opcje weryfikacji są dynamicznie synchronizowane z głównym widokiem deweloperskim"}),e.jsx("button",{onClick:()=>oe(!1),className:"px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg transition",children:"Zamknij podgląd"})]})]})}),Fe&&e.jsx("div",{className:"fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200",children:[e.jsx("h3",{className:"text-sm font-black text-slate-900 uppercase tracking-tight mb-2",children:"Pop-up zablokowany lub zakazany w bezpiecznym iFrame"}),e.jsx("p",{className:"text-xs text-slate-600 leading-relaxed mb-4",children:"Twoja przeglądarka lub kontener deweloperski zablokowały otwarcie nowego okna dla podglądu płachty sal. Aby wydrukować lub zapisać plan jako PDF, postępuj według poniższych kroków:"}),e.jsxs("div",{className:"bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 text-xs font-semibold text-slate-700 mb-6 text-left",children:[e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"1"}),e.jsx("span",{children:"Otwórz aplikację w osobnym oknie przeglądarki za pomocą przycisku w prawym górnym rogu podglądu."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"2"}),e.jsx("span",{children:"Zezwól na wyskakujące okienka (pop-up) dla adresu tej aplikacji w ustawieniach przeglądarki."})]}),e.jsxs("div",{className:"flex items-start gap-2.5",children:[e.jsx("span",{className:"font-extrabold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shrink-0 mt-0.5",children:"3"}),e.jsxs("span",{children:["Alternatywnie użyj przycisku ",e.jsx("strong",{className:"font-black text-slate-900",children:"Drukuj teraz"})," w menu głównym."]})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-3",children:[e.jsx("button",{onClick:()=>{B(!1),window.print()},className:"px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer",children:"Drukuj stąd"}),e.jsx("button",{onClick:()=>B(!1),className:"px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg transition cursor-pointer",children:"Rozumiem"})]})]})})]})}export{bt as default};
