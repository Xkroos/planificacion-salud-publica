import { jsPDF } from 'jspdf'

export const generateCronogramaPDF = async (cohortCronogramas: any[], filename: string) => {
  if (cohortCronogramas.length === 0) return

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const pageW = 297
    const margin = 10

    // Colores UNERG
    const lightBlue = [156, 194, 229] as [number, number, number]
    const red = [255, 0, 0] as [number, number, number]

    let logoImg: HTMLImageElement | null = null
    let logoIzq: HTMLImageElement | null = null
    try {
      logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.src = '/logo-unerg.png'
        img.onload = () => resolve(img)
        img.onerror = (e) => reject(e)
      })
    } catch (e) {
      console.warn('No se pudo cargar el logo unerg', e)
    }

    try {
      logoIzq = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.src = '/logo-caminos.png'
        img.onload = () => resolve(img)
        img.onerror = (e) => reject(e)
      })
    } catch (e) {
      console.warn('No se pudo cargar el logo caminos', e)
    }

    cohortCronogramas.forEach((cronograma, cohortIdx) => {
      if (cohortIdx > 0) doc.addPage()

      let y = margin - 5
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      
      const headerText = [
        'REPÚBLICA BOLIVARIANA DE VENEZUELA',
        'UNIVERSIDAD NACIONAL EXPERIMENTAL RÓMULO GALLEGOS',
        'DECANATO DE POSTGRADO',
        'MAESTRIA EN GERENCIA DE LA SALUD PÚBLICA'
      ]
      
      headerText.forEach(line => {
        doc.text(line, pageW / 2, y, { align: 'center' })
        y += 4.5
      })

      doc.setTextColor(...red)
      doc.setFontSize(11)
      doc.text('CRONOGRAMA DE PLANIFICACION ACADEMICA', pageW / 2, y, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      
      if (logoIzq) {
        const boxW = 45
        const boxH = 15
        const imgRatio = logoIzq.width / logoIzq.height
        const boxRatio = boxW / boxH
        let finalW = boxW
        let finalH = boxH
        if (imgRatio > boxRatio) {
          finalH = finalW / imgRatio
        } else {
          finalW = finalH * imgRatio
        }
        doc.addImage(logoIzq, 'PNG', margin + 30, 5, finalW, finalH)
      }
      
      y += 6

      const drawCell = (text: string, x: number, currentY: number, w: number, h: number, fill?: [number, number, number], textColor?: [number, number, number], fontSize: number = 8, fontStyle: string = 'bold', align: 'center' | 'left' | 'right' = 'center') => {
        if (fill) {
          doc.setFillColor(...fill)
          doc.rect(x, currentY, w, h, 'F')
        }
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.2)
        doc.rect(x, currentY, w, h)
        
        if (textColor) doc.setTextColor(...textColor)
        else doc.setTextColor(0, 0, 0)
        
        doc.setFont('times', fontStyle)
        doc.setFontSize(fontSize)
        
        const lines = doc.splitTextToSize(text, w - 2)
        const textHeight = lines.length * fontSize * 0.35
        const startY = currentY + h / 2 - (textHeight / 2) + (fontSize * 0.35)
        
        if (align === 'center') {
          doc.text(lines, x + w / 2, startY, { align: 'center' })
        } else if (align === 'left') {
          doc.text(lines, x + 1, startY)
        } else {
          doc.text(lines, x + w - 1, startY, { align: 'right' })
        }
      }

      const colA = margin
      const wA = 80
      const colB = colA + wA
      const wB = 35
      const colC = colB + wB
      const wC = 35
      const colD = colC + wC
      const wD = 45
      const colE = colD + wD
      const wE = 42
      const colF = colE + wE
      const wF = 40

      const rh = 7

      drawCell('PERIODO:', colA, y, wA, rh, lightBlue, undefined, 9, 'bold')
      drawCell(`${cronograma.periodo.anio}-${cronograma.periodo.numero} seccion ${cronograma.seccion}`, colB, y, wB + wC + wD, rh, undefined, undefined, 9, 'bold')
      
      // ESPACIO PARA LOGO
      drawCell('', colE, y, wE + wF, rh * 4, undefined, undefined, 9, 'italic')
      if (logoImg) {
        const boxW = wE + wF
        const boxH = rh * 4
        const imgRatio = logoImg.width / logoImg.height
        const boxRatio = boxW / boxH
        let finalW = boxW - 4
        let finalH = boxH - 4
        if (imgRatio > boxRatio) {
          finalH = finalW / imgRatio
        } else {
          finalW = finalH * imgRatio
        }
        const finalX = colE + (boxW - finalW) / 2
        const finalY = y + (boxH - finalH) / 2
        doc.addImage(logoImg, 'PNG', finalX, finalY, finalW, finalH)
      } else {
        doc.text('(Logo UNERG)', colE + (wE + wF) / 2, y + (rh * 4) / 2, { align: 'center' })
      }
      
      y += rh
      drawCell('TRIMESTRE:', colA, y, wA, rh, lightBlue, undefined, 9, 'bold')
      drawCell(`${cronograma.trimestre === 'Introductorio' ? 'INTRODUCTORIO' : cronograma.trimestre + ' TRIMESTRE'}`, colB, y, wB + wC + wD, rh, undefined, undefined, 9, 'bold')
      
      y += rh
      drawCell('MODALIDAD DE ESTUDIO:', colA, y, wA, rh, lightBlue, undefined, 9, 'bold')
      drawCell(`${cronograma.periodo.modalidad}`, colB, y, wB + wC + wD, rh, undefined, undefined, 9, 'normal')
      
      y += rh
      drawCell('VOCERO:', colA, y, wA, rh * 2, lightBlue, undefined, 9, 'bold')
      drawCell(`${cronograma.vocero || ''}`, colB, y, wB, rh * 2, undefined, undefined, 9, 'normal')
      drawCell('TELÉFONO:', colC, y, wC, rh, undefined, undefined, 9, 'normal')
      drawCell(`${cronograma.telefonoVocero || ''}`, colD, y, wD, rh, undefined, undefined, 9, 'normal')
      
      y += rh
      drawCell('e-mail:', colC, y, wC, rh, undefined, undefined, 9, 'normal')
      drawCell(`${cronograma.emailVocero || ''}`, colD, y, wD, rh, undefined, undefined, 9, 'normal')
      drawCell('REGION', colE, y, wE, rh, lightBlue, undefined, 7, 'bold')
      drawCell(`${cronograma.aulaTerritorial.region.nombre}`, colF, y, wF, rh, undefined, undefined, 8, 'normal')
      
      y += rh
      drawCell('CANTIDAD DE PARTICIPANTES:', colA, y, wA, rh * 3, lightBlue, undefined, 9, 'bold')
      drawCell('FEMENINO:', colB, y, wB, rh, undefined, undefined, 9, 'normal')
      drawCell(`${cronograma.participantesFem}`, colC, y, wC + wD, rh, undefined, undefined, 9, 'normal')
      drawCell('AULA TERRITORIAL', colE, y, wE, rh, lightBlue, undefined, 7, 'bold')
      drawCell(`${cronograma.aulaTerritorial.nombre}`, colF, y, wF, rh, undefined, undefined, 8, 'normal')
      
      y += rh
      drawCell('MASCULINO:', colB, y, wB, rh, undefined, undefined, 9, 'normal')
      drawCell(`${cronograma.participantesMasc}`, colC, y, wC + wD, rh, undefined, undefined, 9, 'normal')
      drawCell('COORDINADOR TERRITORIAL', colE, y, wE, rh, lightBlue, undefined, 7, 'bold')
      drawCell(`${cronograma.aulaTerritorial.coordinador || ''}`, colF, y, wF, rh, undefined, undefined, 8, 'normal')
      
      y += rh
      drawCell('TOTAL:', colB, y, wB, rh, undefined, undefined, 9, 'normal')
      drawCell(`${cronograma.participantesFem + cronograma.participantesMasc}`, colC, y, wC + wD, rh, undefined, undefined, 9, 'normal')
      drawCell('ENLACE TERRITORIAL', colE, y, wE, rh, lightBlue, undefined, 7, 'bold')
      drawCell(`${cronograma.aulaTerritorial.enlace || ''}`, colF, y, wF, rh, undefined, undefined, 8, 'normal')

      y += rh + 5

      const tA = 45
      const tCat = 44
      const tSub = tCat / 8
      const tJ = 50
      const tK = 20
      const tL = 30
      const tM = 30
      const tN = 10
      const tO = 18
      const tP = 30

      const hRow1 = 7, hRow2 = 4, hRow3 = 4
      const hTotalHead = hRow1 + hRow2 + hRow3

      let tx = margin
      drawCell('DOCENTE', tx, y, tA, hTotalHead, lightBlue, undefined, 8, 'bold')
      tx += tA

      drawCell('CATEGORIA - DEDICACION\nDOCENTE', tx, y, tCat, hRow1, lightBlue, undefined, 6, 'bold')
      drawCell('CONTRATADO', tx, y + hRow1, tSub * 4, hRow2, undefined, undefined, 5, 'bold')
      drawCell('ORDINARIO', tx + tSub * 4, y + hRow1, tSub * 4, hRow2, undefined, undefined, 5, 'bold');
      
      ['HP', 'MT', 'TC', 'DE', 'HP', 'MT', 'TC', 'DE'].forEach((label, idx) => {
        drawCell(label, tx + tSub * idx, y + hRow1 + hRow2, tSub, hRow3, undefined, undefined, 5, 'normal')
      })
      tx += tCat

      drawCell('UNIDAD CURRICULAR', tx, y, tJ, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tJ
      drawCell('LUGAR', tx, y, tK, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tK
      drawCell('HORARIO', tx, y, tL, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tL
      drawCell('FECHAS DE\nENCUENTROS', tx, y, tM, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tM
      drawCell('U.C', tx, y, tN, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tN
      drawCell('CANT\nHORAS', tx, y, tO, hTotalHead, lightBlue, undefined, 6, 'bold')
      tx += tO
      drawCell('MODALIDAD', tx, y, tP, hTotalHead, lightBlue, undefined, 6, 'bold')
      
      y += hTotalHead

      cronograma.asignaciones.forEach((a: any) => {
        const rowH = Math.max(12, a.fechas.length * 4.5 + 2)
        tx = margin

        const docenteText = a.docente ? a.docente.nombre : ''
        drawCell(docenteText, tx, y, tA, rowH, undefined, undefined, 8, 'normal')
        tx += tA

        const checkPos = (a.docente?.categoria === 'CONTRATADO' ? 0 : (a.docente?.categoria === 'ORDINARIO' ? 4 : -1))
        const dedOff = (a.docente?.dedicacion === 'HP' ? 0 : a.docente?.dedicacion === 'MT' ? 1 : a.docente?.dedicacion === 'TC' ? 2 : a.docente?.dedicacion === 'DE' ? 3 : -1)
        
        for (let i = 0; i < 8; i++) {
          const isChecked = (checkPos >= 0 && dedOff >= 0 && i === checkPos + dedOff)
          drawCell(isChecked ? 'X' : '', tx + tSub * i, y, tSub, rowH, undefined, undefined, 8, 'normal')
        }
        tx += tCat

        drawCell(a.unidad.nombre, tx, y, tJ, rowH, undefined, undefined, 7, 'normal')
        tx += tJ
        drawCell(a.lugar || '', tx, y, tK, rowH, undefined, undefined, 8, 'normal')
        tx += tK
        drawCell(`${a.horaInicio} -\n${a.horaFin}`, tx, y, tL, rowH, undefined, undefined, 8, 'normal')
        tx += tL

        let fY = y
        const dateH = rowH / (a.fechas.length || 1)
        if (a.fechas.length > 0) {
           a.fechas.forEach((f: any) => {
              const dateStr = new Date(f.fecha).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
              drawCell(dateStr, tx, fY, tM, dateH, undefined, undefined, 7, 'normal')
              fY += dateH
           })
        } else {
           drawCell('', tx, y, tM, rowH, undefined, undefined, 7, 'normal')
        }
        tx += tM

        drawCell(a.uc.toString(), tx, y, tN, rowH, undefined, undefined, 8, 'normal')
        tx += tN
        drawCell(`${a.cantHoras}hr`, tx, y, tO, rowH, undefined, undefined, 8, 'normal')
        tx += tO

        let mY = y
        if (a.fechas.length > 0) {
           a.fechas.forEach((f: any) => {
              drawCell(f.modalidad || a.modalidad, tx, mY, tP, dateH, undefined, undefined, 7, 'normal')
              mY += dateH
           })
        } else {
           drawCell(a.modalidad, tx, y, tP, rowH, undefined, undefined, 7, 'normal')
        }
        y += rowH
      })
    })

    doc.save(`${filename}.pdf`)
  } catch (e) {
    console.error(e)
    throw e
  }
}
