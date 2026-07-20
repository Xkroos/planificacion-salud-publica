import React, { forwardRef } from 'react'

type PlantillaCostosPDFProps = {
  cronograma: any
  asignaciones: { id: string, hp: number, viatico: number }[]
  refDocumento: string
  resolucion: string
  coordinadorNacional: string
}

function aplicaViatico(docenteRegion?: string) {
  const r = docenteRegion?.toLowerCase() || ''
  return r.includes('san juan') || r.includes('guarico') || r.includes('guárico')
}

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
    const isSanJuan = aplicaViatico(a.docente?.region?.nombre)
    
    const totalHonorarios = hp * encuentros
    const totalViaticos = isSanJuan ? (viatico * encuentros) : 0
    
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
      isSanJuan,
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
  const costoEncuentroPorParticipante = costoTotalEncuentros / divisorParticipantes
  
  const totalParticipanteTrimestre = preinscripcion + inscripcion + gastosAdmin + costoEncuentroPorParticipante
  const presupuestoTotal = totalParticipanteTrimestre * 5
  const refNumber = parseFloat((refDocumento || '').replace(/\./g, '').replace(',', '.') || '0')
  
  return (
    <div 
      ref={ref} 
      style={{
        width: '1350px', // Fixed wide width to act as a landscape page
        background: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        padding: '20px',
        position: 'absolute',
        top: '-10000px', // Hide off-screen
        left: '-10000px',
        border: '1px solid #ddd'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; vertical-align: middle; }
        .bg-blue { background-color: #8faadc !important; color: black !important; font-weight: bold; }
        .bg-gray { background-color: #f2f2f2 !important; }
        .bg-yellow { background-color: #ffff00 !important; font-weight: bold; }
        .bg-pink { background-color: #e6b8b7 !important; font-weight: bold; }
        .text-red { color: red !important; font-weight: bold; }
        .text-blue { color: #2d6bc4 !important; font-weight: bold; }
        .header-title { font-weight: bold; font-size: 12px; text-align: center; }
        .no-border { border: none !important; }
      `}} />

      {/* HEADER */}
      <table className="pdf-table no-border" style={{ marginBottom: '15px' }}>
        <tbody>
          <tr>
            <td className="no-border" style={{ width: '15%', textAlign: 'left' }}>
               <div style={{ width: '120px', height: '60px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>
                 [Logo Caminos y Horizontes]
               </div>
            </td>
            <td className="no-border header-title" style={{ width: '60%' }}>
              REPÚBLICA BOLIVARIANA DE VENEZUELA<br/>
              UNIVERSIDAD NACIONAL EXPERIMENTAL RÓMULO GALLEGOS<br/>
              DECANATO DE POSTGRADO<br/>
              MAESTRÍA EN GERENCIA DE LA SALUD PÚBLICA
            </td>
            <td className="no-border" style={{ width: '10%' }}>
               <div style={{ width: '80px', height: '80px', border: '1px dashed #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999', margin: '0 auto' }}>
                 [Logo UNERG]
               </div>
            </td>
            <td className="no-border" style={{ width: '15%', textAlign: 'right', fontSize: '10px' }}>
              <table className="pdf-table" style={{ width: '100%', marginBottom: '5px' }}>
                <tbody>
                  <tr>
                    <td className="bg-yellow" style={{ width: '40%' }}>REF.</td>
                    <td>{refDocumento || '-'}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontWeight: 'bold' }}>{coordinadorNacional || 'COORDINADOR NO DEFINIDO'}</div>
              <div>Coordinador(a) Nacional de la MSc Gerencia Salud Pública</div>
              <div>Resolución Nro. {resolucion || '-'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-red" style={{ textAlign: 'center', fontSize: '13px', marginBottom: '8px', textDecoration: 'underline', fontWeight: 'bold' }}>
        FACTIBILIDAD DE GASTOS DE FUNCIONAMIENTO (ESTRUCTURA DE COSTOS)
      </div>

      {/* TOP GRIDS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        {/* Left and Middle Grid merged */}
        <table className="pdf-table" style={{ width: '65%' }}>
          <tbody>
            <tr>
              <td className="bg-blue" style={{ width: '25%' }}>PERIODO:</td>
              <td colSpan={3}>{cronograma.periodo.anio}-{cronograma.periodo.numero}</td>
            </tr>
            <tr>
              <td className="bg-blue">TRIMESTRE:</td>
              <td colSpan={3}>CURSO INTRODUCTORIO</td>
            </tr>
            <tr>
              <td className="bg-blue">MODALIDAD DE ESTUDIO:</td>
              <td colSpan={3}>{cronograma.modalidad?.toUpperCase() || 'MULTIMODAL'}</td>
            </tr>
            <tr>
              <td className="bg-blue" rowSpan={2}>
                <div style={{ marginBottom: '4px' }}>VOCERO:</div>
                <div style={{ fontWeight: 'normal' }}>{cronograma.vocero?.toUpperCase() || ''}</div>
              </td>
              <td style={{ width: '15%' }}>TELÉFONO:</td>
              <td colSpan={2}>{cronograma.telefonoVocero || ''}</td>
            </tr>
            <tr>
              <td>e-mail:</td>
              <td colSpan={2}>{cronograma.emailVocero || ''}</td>
            </tr>
            <tr>
              <td className="bg-blue" rowSpan={3}>CANTIDAD DE PARTICIPANTES:</td>
              <td>FEMENINO:</td>
              <td style={{ width: '20%' }}>{cronograma.participantesFem}</td>
              <td className="bg-blue" style={{ width: '40%' }}>REGION</td>
              <td>{aula.region?.nombre?.toUpperCase() || ''}</td>
            </tr>
            <tr>
              <td>MASCULINO:</td>
              <td>{cronograma.participantesMasc}</td>
              <td className="bg-blue">AULA TERRITORIAL</td>
              <td>{aula.nombre.toUpperCase()}</td>
            </tr>
            <tr>
              <td>TOTAL:</td>
              <td>{participantesTotal}</td>
              <td className="bg-blue">COORDINADOR NACIONAL</td>
              <td>{coordinadorNacional?.toUpperCase() || ''}</td>
            </tr>
            <tr>
              <td colSpan={3} className="no-border"></td>
              <td className="bg-blue">ENLACE TERRITORIAL</td>
              <td>{cronograma.vocero?.toUpperCase() || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* Right Grid */}
        <table className="pdf-table" style={{ width: '35%' }}>
          <tbody>
            <tr>
              <td colSpan={4} className="text-red" style={{ textAlign: 'left', border: 'none' }}>
                PROYECCIÓN ESTIMADO TOTAL POR CADA PARTICIPANTE:
              </td>
            </tr>
            <tr>
              <td colSpan={2}></td>
              <td className="text-red">TRIMESTRAL</td>
              <td className="text-red">MENSUAL</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>PREINSCRIPCIÓN</td>
              <td></td>
              <td>${preinscripcion.toFixed(2)}</td>
              <td>${(preinscripcion / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>INSCRIPCIÓN (MATRICULA)</td>
              <td>{(refNumber * inscripcion).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${inscripcion.toFixed(2)}</td>
              <td>${(inscripcion / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>GASTOS ADMINISTRATIVOS</td>
              <td></td>
              <td>${gastosAdmin.toFixed(2)}</td>
              <td>${(gastosAdmin / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left' }}>ENCUENTROS</td>
              <td></td>
              <td>${costoEncuentroPorParticipante.toFixed(2)}</td>
              <td>${(costoEncuentroPorParticipante / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={2} className="bg-pink text-blue" style={{ fontWeight: 'bold', textAlign: 'center' }}>TOTAL POR PARTICIPANTE EN SU TRIMESTRE</td>
              <td className="bg-pink text-red" style={{ fontWeight: 'bold' }}>${totalParticipanteTrimestre.toFixed(2)}</td>
              <td className="bg-pink text-red" style={{ fontWeight: 'bold' }}>${(totalParticipanteTrimestre / 4).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="bg-yellow text-red" style={{ fontWeight: 'bold', textAlign: 'center' }}>PRESUPUESTO TOTAL DE SU POSTGRADO POR PARTICIPANTE<br/>(02 AÑOS)</td>
              <td className="bg-yellow text-red" style={{ fontWeight: 'bold', fontSize: '14px' }}>${presupuestoTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BOTTOM GRID */}
      <table className="pdf-table">
        <thead>
          <tr>
            <td className="bg-blue text-red" rowSpan={3} style={{ width: '15%' }}>COMPONENTES ESTRUCTURA FUNCIONAMIENTO</td>
            <td className="bg-blue text-red" rowSpan={3} style={{ width: '8%' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                NOMBRES DOCENTES
              </div>
            </td>
            <td className="bg-blue text-red" rowSpan={3} style={{ width: '8%' }}>TABULADOR<br/>(CONSEJO<br/>UNIVERSITARIO)</td>
            <td className="bg-blue text-red" colSpan={2} style={{ width: '10%' }}>DESGLOSE TABULADOR</td>
            <td className="bg-yellow text-red" colSpan={12}>INTRODUCTORIO</td>
            <td className="bg-blue" rowSpan={3} style={{ width: '6%' }}>
              <div style={{ position: 'relative', height: '120px', width: '100%' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold' }}>
                  TOTALES DEL TRIMESTRE
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="bg-blue text-red" rowSpan={2}>VIATICOS</td>
            <td className="bg-blue text-red" rowSpan={2}>HORA ACOMPAÑAMIENTO (HP)</td>
            <td className="text-blue" colSpan={12}>CANTIDAD DE ENCUENTROS EN EL TRIMESTRE</td>
          </tr>
          <tr>
            {[1,2,3,4,5,6].map(i => (
              <React.Fragment key={i}>
                <td colSpan={2} className="text-blue">{i}</td>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Subheader for dates */}
          <tr>
            <td colSpan={5}></td>
            {[0,1,2,3,4,5].map(i => {
              const fechasFirstAsignacion = cronograma.asignaciones[0]?.fechas || []
              let dateStr = '-'
              if (fechasFirstAsignacion[i]) {
                const d = new Date(fechasFirstAsignacion[i].fecha)
                // Usar UTC para evitar que cambie el día por la zona horaria
                dateStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear().toString().slice(-2)}`
              }
              return (
                <React.Fragment key={i}>
                  <td colSpan={2} className="text-blue">
                    {dateStr}
                  </td>
                </React.Fragment>
              )
            })}
            <td></td>
          </tr>
          <tr>
            <td colSpan={5}></td>
            {[1,2,3,4,5,6].map(i => (
              <React.Fragment key={i}>
                <td colSpan={2} className="text-blue" style={{ fontSize: '9px' }}>PRESENCIAL</td>
              </React.Fragment>
            ))}
            <td></td>
          </tr>
          <tr>
            <td colSpan={5}></td>
            {[0,1,2,3,4,5].map(i => (
              <React.Fragment key={i}>
                <td>
                  <div style={{ position: 'relative', height: '60px', width: '100%' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '10px' }}>
                      VIATICO
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ position: 'relative', height: '60px', width: '100%' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', whiteSpace: 'nowrap', fontWeight: 'bold', fontSize: '10px' }}>
                      HP
                    </div>
                  </div>
                </td>
              </React.Fragment>
            ))}
            <td></td>
          </tr>

          {/* Teachers rows */}
          {docentesData.map((d: any, idx: number) => {
             const tabulador = d.hp + d.viatico
             
             return (
               <tr key={idx}>
                 <td style={{ textAlign: 'left', padding: '6px' }}>DOCENTE {idx+1} ({d.zona})</td>
                 <td>
                   <div style={{ fontSize: '10px', whiteSpace: 'normal', wordWrap: 'break-word', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {d.nombre}
                   </div>
                 </td>
                 <td>${tabulador.toFixed(2)}</td>
                 <td>${d.viatico.toFixed(2)}</td>
                 <td>${d.hp.toFixed(2)}</td>
                 {[0,1,2,3,4,5].map(i => {
                   const hasEncuentro = i < d.encuentros
                   return (
                     <React.Fragment key={i}>
                       <td>{hasEncuentro ? `$${d.viatico.toFixed(2)}` : '$0.00'}</td>
                       <td>{hasEncuentro ? `$${d.hp.toFixed(2)}` : '$0.00'}</td>
                     </React.Fragment>
                   )
                 })}
                 <td className="bg-gray" style={{ fontWeight: 'bold' }}>${d.total.toFixed(2)}</td>
               </tr>
             )
          })}

          {/* Aula costs rows */}
          <tr>
            <td style={{ textAlign: 'left' }}>COSTO DEL USO POR EL AULA</td>
            <td colSpan={2}></td>
            <td>$0.00</td>
            <td>$0.00</td>
            <td colSpan={12}></td>
            <td className="bg-gray" style={{ fontWeight: 'bold' }}>$0.00</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>LIMPIEZA</td>
            <td colSpan={2}></td>
            <td>$0.00</td>
            <td>${limpieza.toFixed(2)}</td>
            <td colSpan={12}></td>
            <td className="bg-gray" style={{ fontWeight: 'bold' }}>${limpieza.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>VIGILANCIA</td>
            <td colSpan={2}></td>
            <td>$0.00</td>
            <td>${vigilancia.toFixed(2)}</td>
            <td colSpan={12}></td>
            <td className="bg-gray" style={{ fontWeight: 'bold' }}>${vigilancia.toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ textAlign: 'left' }}>APORTE COORDINACION</td>
            <td colSpan={2}></td>
            <td>$0.00</td>
            <td>${aporteCoordinacion.toFixed(2)}</td>
            <td colSpan={12}></td>
            <td className="bg-gray" style={{ fontWeight: 'bold' }}>${aporteCoordinacion.toFixed(2)}</td>
          </tr>

          {/* Totals rows */}
          {/* Fila 1: Viáticos y HP separados por encuentro */}
          <tr>
            <td colSpan={5} className="bg-blue"></td>
            {[0, 1, 2, 3, 4, 5].map(i => {
              let colViatico = 0
              let colHp = 0
              docentesData.forEach((d: any) => {
                if (i < d.encuentros) {
                  colViatico += d.viatico
                  colHp += d.hp
                }
              })
              return (
                <React.Fragment key={i}>
                  <td className="bg-yellow" style={{ fontWeight: 'bold' }}>${colViatico > 0 ? colViatico.toFixed(2) : '0.00'}</td>
                  <td className="bg-yellow" style={{ fontWeight: 'bold' }}>${colHp > 0 ? colHp.toFixed(2) : '0.00'}</td>
                </React.Fragment>
              )
            })}
            <td className="bg-blue"></td>
          </tr>

          {/* Fila 2: Suma de Viático + HP por encuentro */}
          <tr>
            <td colSpan={5} className="bg-gray text-red" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              COSTOS TOTALES POR ENCUENTROS -----------
            </td>
            {[0, 1, 2, 3, 4, 5].map(i => {
              let colTotal = 0
              docentesData.forEach((d: any) => {
                if (i < d.encuentros) {
                  colTotal += d.viatico + d.hp
                }
              })
              return (
                <td colSpan={2} key={i} style={{ fontWeight: 'bold' }}>
                  ${colTotal > 0 ? colTotal.toFixed(2) : '0.00'}
                </td>
              )
            })}
            <td className="bg-gray" style={{ fontWeight: 'bold' }}>${costoTotalEncuentros.toFixed(2)}</td>
          </tr>

          {/* Fila 3: Suma por encuentro dividida entre participantes */}
          <tr>
            <td colSpan={5} className="bg-gray text-red" style={{ textAlign: 'right', fontWeight: 'bold' }}>
              COSTOS DEL ENCUENTRO POR PARTICIPANTE -----------
            </td>
            {[0, 1, 2, 3, 4, 5].map(i => {
              let colTotal = 0
              docentesData.forEach((d: any) => {
                if (i < d.encuentros) {
                  colTotal += d.viatico + d.hp
                }
              })
              const perParticipant = colTotal / divisorParticipantes
              return (
                <td colSpan={2} key={i} style={{ fontWeight: 'bold' }}>
                  ${perParticipant > 0 ? perParticipant.toFixed(2) : '0.00'}
                </td>
              )
            })}
            <td className="bg-pink text-red" style={{ fontWeight: 'bold' }}>${costoEncuentroPorParticipante.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* FOOTER SIGNATURES */}
      <div style={{ marginTop: '30px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>
        <div>{coordinadorNacional || 'COORDINADOR NO DEFINIDO'}</div>
        <div>Coordinador(a) Nacional de la MSc Gerencia Salud Pública</div>
        <div>Resolución Nro. {resolucion || '-'} de fecha {new Date().toLocaleDateString('es-VE')}</div>
      </div>
    </div>
  )
})

PlantillaCostosPDF.displayName = 'PlantillaCostosPDF'
