'use client'

import { useState, useRef } from 'react'
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  RefreshCw,
  HelpCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface ImportarParticipantesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type TabType = 'errores' | 'validas'

export default function ImportarParticipantesModal({
  isOpen,
  onClose,
  onSuccess
}: ImportarParticipantesModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('errores')

  // Datos de validación recibidos del servidor
  const [validationResult, setValidationResult] = useState<any | null>(null)

  // Alerta Central Destacada de Unicidad
  const [mostrarAlertaCentralUnicidad, setMostrarAlertaCentralUnicidad] = useState(false)
  const [mensajeAlertaCentral, setMensajeAlertaCentral] = useState('')

  // Reporte post-importación
  const [reporteFinal, setReporteFinal] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // Procesar archivo seleccionado
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Por favor selecciona un archivo Excel válido (.xlsx o .xls)')
      return
    }

    setFile(selectedFile)
    setValidationResult(null)
    setReporteFinal(null)
    await validarArchivo(selectedFile)
  }

  // Enviar archivo al backend para validación exhaustiva
  const validarArchivo = async (archivoAValidar: File) => {
    setValidating(true)
    setMostrarAlertaCentralUnicidad(false)

    try {
      const formData = new FormData()
      formData.append('archivo', archivoAValidar)

      const res = await fetch('/sistema/api/participantes/importar/validar', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al validar el archivo')
      }

      setValidationResult(data)

      // REQUISITO ESTRICTO: Si hay conflicto de duplicidad de Cédula, Teléfono o Correo,
      // mostrar la alerta visual destacada EN EL MEDIO DE LA PANTALLA
      if (data.hayConflictoUnicidad) {
        setMensajeAlertaCentral(
          data.mensajeConflictoUnicidad ||
          'Error: El correo, número de teléfono o cédula ya se encuentran registrados en el sistema.'
        )
        setMostrarAlertaCentralUnicidad(true)
        setActiveTab('errores')
      } else if (data.totalErrores > 0) {
        setActiveTab('errores')
        toast.error(`Se detectaron errores en ${data.totalErrores} filas del Excel`)
      } else {
        setActiveTab('validas')
        toast.success(`¡Excelente! Las ${data.totalValidas} filas son válidas y listas para importar`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el archivo')
    } finally {
      setValidating(false)
    }
  }

  // Confirmar e insertar los registros válidos
  const handleEjecutarImportacion = async () => {
    if (!validationResult || validationResult.filasValidas.length === 0) return

    setImporting(true)
    try {
      const res = await fetch('/sistema/api/participantes/importar/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filas: validationResult.filasValidas })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al importar participantes')
      }

      setReporteFinal(data.resultado)
      toast.success(data.mensaje || 'Importación completada')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los registros')
    } finally {
      setImporting(false)
    }
  }

  // Descargar plantilla oficial
  const handleDescargarPlantilla = () => {
    window.open('/sistema/api/participantes/importar/plantilla', '_blank')
  }

  // Exportar reporte de errores a un Excel descargable
  const handleExportarReporteErrores = () => {
    if (!validationResult || validationResult.filasConError.length === 0) return

    const filasParaExportar = validationResult.filasConError.map((item: any) => ({
      'Fila en Excel': item.numeroFila,
      'Cédula': item.cedula,
      'Nombre': item.nombre,
      'Apellido': item.apellido,
      'Tipo de Error': item.esConflictoUnicidad ? 'DUPLICADO (Cédula/Tlf/Correo)' : 'VALIDACIÓN / CATÁLOGO',
      'Detalle de Errores': item.errores.join(' | ')
    }))

    const ws = XLSX.utils.json_to_sheet(filasParaExportar)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 60 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Errores_Importacion')
    XLSX.writeFile(wb, 'reporte_errores_importacion_participantes.xlsx')
  }

  // Reiniciar estado para subir otro archivo
  const handleLimpiar = () => {
    setFile(null)
    setValidationResult(null)
    setReporteFinal(null)
    setMostrarAlertaCentralUnicidad(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1050 }}>
        <div
          className="modal"
          style={{
            maxWidth: '920px',
            width: '95%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FileSpreadsheet size={20} color="#16a34a" />
              </div>
              <div>
                <h3 className="modal-title" style={{ fontSize: '17px', color: '#1a3a6b', fontWeight: 700 }}>
                  Importación Masiva de Participantes por Lotes (Excel)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Valida en tiempo real duplicados, períodos activos y aulas territoriales
                </p>
              </div>
            </div>
            <button className="btn-icon" onClick={onClose} disabled={validating || importing}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Paso 1: Carga de archivo o Botón de Descargar Plantilla */}
            {!reporteFinal && (
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Selecciona o arrastra el archivo de Excel:
                  </span>
                  <button
                    type="button"
                    onClick={handleDescargarPlantilla}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} color="#0369a1" /> Descargar Plantilla Oficial (.xlsx)
                  </button>
                </div>

                {/* Zona de Drop / Input de archivo */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: file ? '#f8fafc' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                  />

                  {validating ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={32} className="animate-spin text-blue-600" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
                        Validando filas, catálogos y duplicados en la base de datos...
                      </span>
                    </div>
                  ) : file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <FileSpreadsheet size={28} color="#16a34a" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{file.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {(file.size / 1024).toFixed(1)} KB &bull; Clic para cambiar archivo
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={30} color="#64748b" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        Haz clic aquí para seleccionar el archivo Excel o arrástralo
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Formatos admitidos: .xlsx o .xls
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paso 2: Resumen Previo (Cards de Métricas) */}
            {validationResult && !reporteFinal && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}
                >
                  {/* Total */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#334155' }}>
                      {validationResult.totalFilas}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Filas Leídas</div>
                  </div>

                  {/* Válidas */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803d' }}>
                      {validationResult.totalValidas}
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Válidas para Importar</div>
                  </div>

                  {/* Errores */}
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#b91c1c' }}>
                      {validationResult.totalErrores}
                    </div>
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>Filas Rechazadas</div>
                  </div>
                </div>

                {/* Tabs de Navegación de Detalles */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('errores')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'errores' ? '3px solid #dc2626' : '3px solid transparent',
                      color: activeTab === 'errores' ? '#dc2626' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <XCircle size={15} /> Filas con Errores ({validationResult.totalErrores})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('validas')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: 'none',
                      border: 'none',
                      borderBottom: activeTab === 'validas' ? '3px solid #16a34a' : '3px solid transparent',
                      color: activeTab === 'validas' ? '#16a34a' : '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <CheckCircle2 size={15} /> Filas Válidas ({validationResult.totalValidas})
                  </button>
                </div>

                {/* Contenido del Tab: Filas con Errores */}
                {activeTab === 'errores' && (
                  <div>
                    {validationResult.totalErrores === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: '10px' }}>
                        <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 700 }}>¡Sin errores! Todas las filas cumplen las reglas del sistema.</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Estas filas serán omitidas para no comprometer la integridad de la base de datos:
                          </span>
                          <button
                            type="button"
                            onClick={handleExportarReporteErrores}
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={13} /> Exportar Reporte de Errores (.xlsx)
                          </button>
                        </div>

                        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #fecaca', borderRadius: '8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#fef2f2', textAlign: 'left', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
                                <th style={{ padding: '8px 12px', width: '60px' }}>Fila</th>
                                <th style={{ padding: '8px 12px', width: '110px' }}>Cédula</th>
                                <th style={{ padding: '8px 12px', width: '180px' }}>Estudiante</th>
                                <th style={{ padding: '8px 12px' }}>Motivos de Rechazo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.filasConError.map((item: any, idx: number) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: item.esConflictoUnicidad ? '#fff1f2' : 'white' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#dc2626' }}>
                                    #{item.numeroFila}
                                  </td>
                                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>
                                    {item.cedula}
                                  </td>
                                  <td style={{ padding: '8px 12px', color: '#334155' }}>
                                    {item.apellido}, {item.nombre}
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      {item.errores.map((errStr: string, eIdx: number) => (
                                        <span
                                          key={eIdx}
                                          style={{
                                            background: errStr.includes('duplicad') || errStr.includes('ya se encuentra') ? '#fee2e2' : '#fef3c7',
                                            color: errStr.includes('duplicad') || errStr.includes('ya se encuentra') ? '#991b1b' : '#92400e',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            display: 'inline-block'
                                          }}
                                        >
                                          &bull; {errStr}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Contenido del Tab: Filas Válidas */}
                {activeTab === 'validas' && (
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', width: '50px' }}>Fila</th>
                          <th style={{ padding: '8px 12px' }}>Cédula</th>
                          <th style={{ padding: '8px 12px' }}>Nombre y Apellido</th>
                          <th style={{ padding: '8px 12px' }}>Género</th>
                          <th style={{ padding: '8px 12px' }}>Nivel</th>
                          <th style={{ padding: '8px 12px' }}>Período</th>
                          <th style={{ padding: '8px 12px' }}>Aula / Sede</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.filasValidas.map((item: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>#{item.numeroFila}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0369a1' }}>{item.cedula}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.apellido}, {item.nombre}</td>
                            <td style={{ padding: '8px 12px' }}>{item.genero}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ background: '#f0f9ff', color: '#0284c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {item.trimestre}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>{item.periodoInfo}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>
                              {item.aulaNombre} ({item.regionNombre})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Paso 3: Reporte Post-Importación */}
            {reporteFinal && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    background: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <CheckCircle2 size={36} color="#16a34a" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#166534', marginBottom: '8px' }}>
                  ¡Importación Masiva Completada con Éxito!
                </h3>
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
                  Se han insertado <strong style={{ color: '#16a34a' }}>{reporteFinal.totalInsertados} participantes</strong> en la base de datos vinculados formalmente a sus períodos y niveles correspondientes.
                </p>

                {reporteFinal.totalFallos > 0 && (
                  <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: '16px' }}>
                    <AlertTriangle size={16} /> Hubo {reporteFinal.totalFallos} registros que fallaron en la transacción final.
                  </div>
                )}

                <button className="btn btn-primary" onClick={onClose} style={{ padding: '10px 24px' }}>
                  Cerrar y Ver Participantes
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {!reporteFinal && (
            <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {file && (
                  <button
                    type="button"
                    onClick={handleLimpiar}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                    disabled={importing}
                  >
                    <RefreshCw size={12} style={{ marginRight: '4px' }} /> Cambiar Archivo
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={importing || validating}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEjecutarImportacion}
                  disabled={
                    importing ||
                    validating ||
                    !validationResult ||
                    validationResult.totalValidas === 0
                  }
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {importing && <Loader2 size={16} className="animate-spin" />}
                  {importing
                    ? 'Guardando en Base de Datos...'
                    : `Confirmar e Importar (${validationResult?.totalValidas || 0})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALERTA VISUAL CENTRAL DESTACADA: CONFLICTO DE UNICIDAD (REQUISITO ESTRICTO) */}
      {/* ========================================================================= */}
      {mostrarAlertaCentralUnicidad && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setMostrarAlertaCentralUnicidad(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '90%',
              padding: '28px 24px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #ef4444',
              animation: 'scaleIn 0.2s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Ícono de Error Central */}
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#fee2e2',
                border: '2px solid #f87171',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#dc2626'
              }}
            >
              <AlertTriangle size={36} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '12px' }}>
              Conflicto de Duplicidad Detectado
            </h3>

            {/* MENSAJE EXACTO SOLICITADO POR EL USUARIO */}
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '10px',
                padding: '14px 16px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#b91c1c',
                lineHeight: 1.4,
                marginBottom: '16px'
              }}
            >
              Error: El correo, número de teléfono o cédula ya se encuentran registrados en el sistema.
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', lineHeight: 1.5 }}>
              El archivo contiene registros cuya <strong>Cédula</strong>, <strong>Correo</strong> o <strong>Teléfono</strong> ya existen en el sistema o se encuentran duplicados dentro del mismo lote. Revisa la pestaña de <strong>Filas con Errores</strong> para ver el detalle de cada fila.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setMostrarAlertaCentralUnicidad(false)}
              style={{
                background: '#dc2626',
                borderColor: '#b91c1c',
                color: 'white',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 700,
                width: '100%',
                borderRadius: '8px'
              }}
            >
              Entendido &bull; Revisar Detalles de Errores
            </button>
          </div>
        </div>
      )}
    </>
  )
}

