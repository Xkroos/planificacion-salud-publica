import React, { forwardRef } from 'react'

type PlantillaCostosPDFProps = {
  cronograma: any
  asignaciones: { id: string, hp: number, viatico: number }[]
  refDocumento: string
  resolucion: string
  coordinadorNacional: string
}

import { determinarTipoViatico } from '@/lib/viaticos'

export const PlantillaCostosPDF = forwardRef<HTMLDivElement, PlantillaCostosPDFProps>(({
  cronograma,
  asignaciones,
  refDocumento,
  resolucion,
  coordinadorNacional
}, ref) => {
  const aula = cronograma.aulaTerritorial
  const participantesTotal = (cronograma.participantesFem || 0) + (cronograma.participantesMasc || 0)
  const divisorParticipantes = participantesTotal > 0 ? participantesTotal : 1
  
  // Calculate expenses
  let totalEgresosHonorarios = 0
  let totalEgresosViaticos = 0
  
  const docentesData = cronograma.asignaciones.map((a: any) => {
    const match = asignaciones.find((x: any) => x.id === a.id)
    const hp = match?.hp ?? 0
    const viatico = match?.viatico ?? 0
    const encuentros = a.fechas?.length || 0
    const tipoViatico = determinarTipoViatico(a.docente?.region?.nombre, aula.region?.nombre)
    const hasViatico = tipoViatico !== 'NO_APLICA'
    
    const totalHonorarios = hp * encuentros
    const totalViaticos = hasViatico ? (viatico * encuentros) : 0
    
    totalEgresosHonorarios += totalHonorarios
    totalEgresosViaticos += totalViaticos
    
    return {
      unidad: a.unidad.nombre,
      nombre: a.docente?.nombre || 'Docente no asignado',
      zona: a.docente?.region?.nombre || 'Sin Región',
      hp,
      viatico,
      encuentros,
      fechas: a.fechas || [],
      hasViatico,
      totalHonorarios,
      totalViaticos,
      total: totalHonorarios + totalViaticos
    }
  })
  
  const preinscripcion = aula.preinscripcion || 0
  const inscripcion = aula.inscripcion || 0
  const gastosAdmin = aula.gastosAdministrativos || 0
  
  const limpieza = aula.limpieza || 0
  const vigilancia = aula.vigilancia || 0
  const aporteCoordinacion = aula.aporteCoordinacion || 0

  const costoTotalEncuentros = totalEgresosHonorarios + totalEgresosViaticos + limpieza + vigilancia + aporteCoordinacion
  const hasParticipantes = participantesTotal > 0
  const costoEncuentroPorParticipante = hasParticipantes ? (costoTotalEncuentros / participantesTotal) : 0
  
  const totalParticipanteTrimestre = preinscripcion + inscripcion + gastosAdmin + costoEncuentroPorParticipante
  const presupuestoTotal = totalParticipanteTrimestre * 5
  const refNumber = parseFloat((refDocumento || '').replace(/\./g, '').replace(',', '.') || '0')
  
  return (
    <div 
      ref={ref} 
      style={{
        width: '1350px',
        background: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        padding: '30px',
        position: 'absolute',
        top: '-10000px',
        left: '-10000px',
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 10px; vertical-align: middle; }
        .bg-yellow { background-color: #ffff00 !important; color: black !important; font-weight: bold; }
        .bg-blue { background-color: #8ea9db !important; color: black !important; font-weight: bold; }
        .bg-light-blue { background-color: #b4c6e7 !important; color: black !important; font-weight: bold; }
        .bg-purple { background-color: #d9e1f2 !important; color: black !important; font-weight: bold; }
        .text-red { color: red !important; font-weight: bold; }
        .text-bold { font-weight: bold; }
        .no-border { border: none !important; }
        .header-title { font-weight: bold; font-size: 13px; text-align: center; line-height: 1.2; }
      `}} />

      {/* HEADER */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        {/* Red Box for REF and DATE */}
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'black', padding: '4px', width: '90px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', border: '1px solid black' }}>
          <div style={{ borderBottom: '1px solid black', marginBottom: '2px', paddingBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
            <span>REF</span>
            <span>{refDocumento || '-'}</span>
          </div>
          <div>{new Date().toLocaleDateString('es-ES')}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ width: '180px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo-caminos.png" alt="Caminos y Horizontes" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          
          <div style={{ textAlign: 'center', flex: 1, fontSize: '9px', fontWeight: 'bold', lineHeight: '1.2' }}>
            REPÚBLICA BOLIVARIANA DE VENEZUELA<br/>
            UNIVERSIDAD NACIONAL EXPERIMENTAL RÓMULO GALLEGOS<br/>
            DECANATO DE POSTGRADO<br/>
            MAESTRÍA EN GERENCIA DE LA SALUD PÚBLICA<br/>
            REGION: {cronograma.aulaTerritorial.region.nombre.toUpperCase()}<br/>
            AULA ACADÉMICA TERRITORIAL: {cronograma.aulaTerritorial.nombre.toUpperCase()}
          </div>

          <div style={{ width: '180px', height: '90px' }}></div>
        </div>

        {/* Absolute UNERG Logo */}
        <div style={{ position: 'absolute', top: '-30px', right: '110px', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <img src="/logo-unerg.png" alt="UNERG" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', textDecoration: 'underline', marginTop: '10px' }}>
          ESTRUCTURA DE COSTOS
        </div>
      </div>

      {/* TOP GRIDS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        {/* Left Grid */}
        <table className="pdf-table" style={{ width: '60%' }}>
          <tbody>
            <tr>
              <td className="bg-yellow" style={{ width: '22%' }}>TRIMESTRE:</td>
              <td colSpan={5} style={{ width: '78%' }}>CURSO INTRODUCTORIO</td>
            </tr>
            <tr>
              <td className="bg-yellow">LAPSO ACADÉMICO:</td>
              <td colSpan={5}>{cronograma.periodo?.anio}-{cronograma.periodo?.numero}</td>
            </tr>
            <tr>
              <td className="bg-yellow">MODALIDAD DE ESTUDIO:</td>
              <td colSpan={5}>{cronograma.modalidad?.toUpperCase() || 'MULTIMODAL'}</td>
            </tr>
            <tr>
              <td className="bg-yellow" rowSpan={2}>VOCERO:</td>
              <td style={{ width: '22%' }}>NOMBRE Y APELLIDO</td>
              <td style={{ width: '15%' }}>TELEFONO:</td>
              <td style={{ width: '15%' }}>e-mail:</td>
              <td className="bg-yellow" colSpan={2} style={{ width: '26%' }}>CANTIDAD DE PARTICIPANTES</td>
            </tr>
            <tr>
              <td>{cronograma.vocero?.toUpperCase() || ''}</td>
              <td>{cronograma.telefonoVocero || ''}</td>
              <td>{cronograma.emailVocero || ''}</td>
              <td className="bg-yellow" style={{ width: '13%' }}>MASCULINO:</td>
              <td style={{ width: '13%' }}>{cronograma.participantesMasc}</td>
            </tr>
            <tr>
              <td className="bg-yellow">COORDINADOR NACIONAL:</td>
              <td colSpan={3}>{coordinadorNacional?.toUpperCase() || ''}</td>
              <td className="bg-yellow">FEMENINO:</td>
              <td>{cronograma.participantesFem}</td>
            </tr>
            <tr>
              <td className="bg-yellow">ENLACE TERRITORIAL:</td>
              <td colSpan={2}>{cronograma.vocero?.toUpperCase() || ''}</td>
              <td className="text-bold">TOTAL:</td>
              <td className="bg-yellow">TOTAL</td>
              <td>{participantesTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Right Grid */}
        <table className="pdf-table" style={{ width: '40%' }}>
          <tbody>
            <tr>
              <td colSpan={4} className="bg-light-blue text-bold" style={{ textAlign: 'center' }}>
                PROYECCIÓN ESTIMADO TOTAL POR CADA PARTICIPANTE:
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="no-border"></td>
              <td className="text-bold" style={{ width: '20%' }}>TRIMESTRAL</td>
              <td className="text-bold" style={{ width: '20%' }}>MENSUAL</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'left' }}>PREINSCRIPCIÓN</td>
              <td>${preinscripcion.toFixed(2)}</td>
              <td>${(preinscripcion / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', width: '40%' }}>INSCRIPCIÓN (MATRICULA)</td>
              <td style={{ width: '20%' }}>{(refNumber * inscripcion).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${inscripcion.toFixed(2)}</td>
              <td>${(inscripcion / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'left' }}>GASTOS ADMINISTRATIVOS</td>
              <td>${gastosAdmin.toFixed(2)}</td>
              <td>${(gastosAdmin / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'left' }}>ENCUENTROS</td>
              <td>{hasParticipantes ? `$${costoEncuentroPorParticipante.toFixed(2)}` : '#DIV/0!'}</td>
              <td>{hasParticipantes ? `$${(costoEncuentroPorParticipante / 4).toFixed(2)}` : '#DIV/0!'}</td>
            </tr>
            <tr>
              <td colSpan={2} className="bg-light-blue text-bold" style={{ textAlign: 'center' }}>TOTAL POR PARTICIPANTE EN SU TRIMESTRE</td>
              <td className="bg-light-blue text-bold">{hasParticipantes ? `$${totalParticipanteTrimestre.toFixed(2)}` : '#DIV/0!'}</td>
              <td className="bg-light-blue text-bold">{hasParticipantes ? `$${(totalParticipanteTrimestre / 4).toFixed(2)}` : '#DIV/0!'}</td>
            </tr>
            <tr>
              <td colSpan={3} className="bg-yellow text-bold" style={{ textAlign: 'center' }}>PRESUPUESTO TOTAL DE SU POSTGRADO<br/>POR PARTICIPANTE (02 AÑOS)</td>
              <td className="bg-yellow text-bold" style={{ fontSize: '12px' }}>{hasParticipantes ? `$${presupuestoTotal.toFixed(2)}` : '#DIV/0!'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BOTTOM GRID */}
      <table className="pdf-table">
        <thead>
          <tr>
            <td className="bg-yellow" rowSpan={5} style={{ width: '14%' }}>COMPONENTES<br/>ESTRUCTURA<br/>FUNCIONAMIENTO</td>
            <td className="bg-yellow" rowSpan={5} style={{ width: '5%' }}>
              <div style={{ position: 'relative', height: '120px', width: '100%' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '9px', fontWeight: 'bold' }}>
                  NOMBRES DOCENTES
                </div>
              </div>
            </td>
            <td className="bg-yellow" rowSpan={5} style={{ width: '6%' }}>TABULADOR<br/>(CONSEJO<br/>UNIVERSITARIO)</td>
            <td className="bg-yellow" colSpan={2} style={{ width: '8%' }}>DESGLOSE TABULADOR</td>
            <td className="bg-blue" colSpan={12}>INTRODUCTORIO</td>
            <td className="bg-yellow" rowSpan={5} style={{ width: '4%' }}>
              <div style={{ position: 'relative', height: '120px', width: '100%' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold' }}>
                  TOTALES DEL TRIMESTRE
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="bg-yellow" rowSpan={4} style={{ width: '4%' }}>
              <div style={{ position: 'relative', height: '100px', width: '100%' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold' }}>
                  VIATICOS
                </div>
              </div>
            </td>
            <td className="bg-yellow" rowSpan={4} style={{ width: '4%' }}>
              <div style={{ position: 'relative', height: '100px', width: '100%' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '8px', fontWeight: 'bold' }}>
                  HORA ACOMPAÑADA<br/>MENSUAL (HP)
                </div>
              </div>
            </td>
            <td className="bg-light-blue" colSpan={12} style={{ color: '#2d6bc4 !important' }}>CANTIDAD DE ENCUENTROS EN EL TRIMESTRE</td>
          </tr>
          <tr>
            {[1,2,3,4,5,6].map(i => (
              <td key={i} colSpan={2} className="bg-purple text-bold">{i}</td>
            ))}
          </tr>
          <tr>
            {[0,1,2,3,4,5].map(i => {
              const fechasFirstAsignacion = cronograma.asignaciones[0]?.fechas || []
              let dateStr = ''
              if (fechasFirstAsignacion[i]) {
                 const d = new Date(fechasFirstAsignacion[i].fecha)
                 dateStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear().toString().slice(-2)}`
              }
              return (
                <td colSpan={2} key={i} className="bg-purple text-bold" style={{ fontSize: '9px', height: '24px' }}>
                  {dateStr ? (
                    <>
                      <div>{dateStr}</div>
                      <div>PRESENCIAL</div>
                    </>
                  ) : (
                    <div>-</div>
                  )}
                </td>
              )
            })}
          </tr>
          <tr>
            {[0,1,2,3,4,5].map(i => (
              <React.Fragment key={i}>
                <td className="bg-purple text-bold" style={{ width: '3.6%' }}>
                  <div style={{ position: 'relative', height: '50px', width: '100%' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', fontSize: '9px' }}>VIATICO</div>
                  </div>
                </td>
                <td className="bg-purple text-bold" style={{ width: '3.6%' }}>
                  <div style={{ position: 'relative', height: '50px', width: '100%' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', fontSize: '9px' }}>HP</div>
                  </div>
                </td>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>

          {docentesData.map((d: any, idx: number) => {
            const tabulador = d.hp
            return (
              <tr key={idx}>
                <td style={{ textAlign: 'left', textTransform: 'uppercase' }}>DOCENTE {idx+1} ({d.zona})</td>
                <td style={{ textTransform: 'uppercase', fontSize: '8px' }}>{d.nombre}</td>
                <td>${tabulador.toFixed(2)}</td>
                <td>${d.hasViatico ? d.viatico.toFixed(2) : '0.00'}</td>
                <td>${d.hp.toFixed(2)}</td>
                {[0,1,2,3,4,5].map(i => {
                  const hasEncuentro = i < d.encuentros
                  return (
                    <React.Fragment key={i}>
                      <td>{hasEncuentro && d.hasViatico ? `$${d.viatico.toFixed(2)}` : '$0.00'}</td>
                      <td>{hasEncuentro ? `$${d.hp.toFixed(2)}` : '$0.00'}</td>
                    </React.Fragment>
                  )
                })}
                <td className="text-bold">${d.total.toFixed(2)}</td>
              </tr>
            )
          })}

          <tr>
            <td style={{ textAlign: 'left' }}>COSTO DEL USO POR EL AULA</td>
            <td colSpan={2}></td>
            <td>$0.00</td>
            <td>$0.00</td>
            {[0,1,2,3,4,5].map(i => (
               <React.Fragment key={i}>
                  <td>$0.00</td>
                  <td>$0.00</td>
               </React.Fragment>
            ))}
            <td className="text-bold">$0.00</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>LIMPIEZA</td>
            <td colSpan={2}></td>
            <td></td>
            <td></td>
            {[0,1,2,3,4,5].map(i => (
               <React.Fragment key={i}>
                  <td></td>
                  <td></td>
               </React.Fragment>
            ))}
            <td className="text-bold">${limpieza.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>VIGILANCIA</td>
            <td colSpan={2}></td>
            <td></td>
            <td></td>
            {[0,1,2,3,4,5].map(i => (
               <React.Fragment key={i}>
                  <td></td>
                  <td></td>
               </React.Fragment>
            ))}
            <td className="text-bold">${vigilancia.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>APORTE COORDINACION</td>
            <td colSpan={2}></td>
            <td></td>
            <td></td>
            {[0,1,2,3,4,5].map(i => (
               <React.Fragment key={i}>
                  <td></td>
                  <td></td>
               </React.Fragment>
            ))}
            <td className="text-bold">${aporteCoordinacion.toFixed(2)}</td>
          </tr>

          <tr>
            <td colSpan={5} className="bg-yellow text-bold" style={{ textAlign: 'right' }}>COSTOS TOTALES POR ENCUENTROS -----------</td>
            {[0,1,2,3,4,5].map(i => {
              let colViatico = 0
              let colHp = 0
              docentesData.forEach((d: any) => {
                if (i < d.encuentros) {
                  if (d.hasViatico) colViatico += d.viatico
                  colHp += d.hp
                }
              })
              return (
                <React.Fragment key={i}>
                  <td className="bg-light-blue text-bold">
                    ${colViatico > 0 ? colViatico.toFixed(2) : '0.00'}
                  </td>
                  <td className="bg-light-blue text-bold">
                    ${colHp > 0 ? colHp.toFixed(2) : '0.00'}
                  </td>
                </React.Fragment>
              )
            })}
            <td className="bg-yellow text-bold">${costoTotalEncuentros.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={5} className="bg-yellow text-bold" style={{ textAlign: 'right' }}>COSTOS DEL ENCUENTRO POR PARTICIPANTE -----------</td>
            {[0,1,2,3,4,5].map(i => {
              let colTotal = 0
              docentesData.forEach((d: any) => {
                if (i < d.encuentros) {
                  colTotal += (d.hasViatico ? d.viatico : 0) + d.hp
                }
              })
              const perParticipant = hasParticipantes ? (colTotal / participantesTotal) : 0
              return (
                <td colSpan={2} key={i} className="text-bold">
                  {hasParticipantes ? `$${perParticipant.toFixed(2)}` : '#DIV/0!'}
                </td>
              )
            })}
            <td className="bg-yellow text-bold">{hasParticipantes ? `$${costoEncuentroPorParticipante.toFixed(2)}` : '#DIV/0!'}</td>
          </tr>
        </tbody>
      </table>

      {/* FOOTER SIGNATURES */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>
        <div>Dra. {coordinadorNacional || 'MILDRE PEREZ'}</div>
        <div>Coordinadora Nacional de la Msc Gerencia Salud Publica</div>
        <div>Resolución Nro. {resolucion || '-'}</div>
      </div>
    </div>
  )
})

PlantillaCostosPDF.displayName = 'PlantillaCostosPDF'
