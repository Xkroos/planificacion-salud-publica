import { jsPDF } from 'jspdf'

export const generateCronogramaPDF = async (cohortCronogramas: any[], filename: string) => {
  if (cohortCronogramas.length === 0) return

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const pageW = 297
    const margin = 8

    const yellow: [number, number, number] = [255, 255, 0]
    const lightBlue: [number, number, number] = [156, 194, 229]
    const black: [number, number, number] = [0, 0, 0]
    const red: [number, number, number] = [192, 0, 0]

    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise(resolve => {
        const img = new window.Image()
        img.src = src
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
      })

    const [logoUnerg, logoCaminos] = await Promise.all([
      loadImg('/logo-unerg.png'),
      loadImg('/logo-caminos.png'),
    ])

    // ─── drawCell segura ───────────────────────────────────────────────────────
    const drawCell = (
      text: string,
      x: number, y: number, w: number, h: number,
      fill?: [number, number, number],
      textColor: [number, number, number] = [0, 0, 0],
      fontSize = 7,
      fontStyle: 'bold' | 'normal' | 'italic' = 'normal',
      align: 'center' | 'left' | 'right' = 'center',
      border = true
    ) => {
      // Guardia: valores inválidos → saltar celda sin error
      if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return

      if (fill) {
        doc.setFillColor(...fill)
        doc.rect(x, y, w, h, 'F')
      }
      if (border) {
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.2)
        doc.rect(x, y, w, h)
      }
      if (!text) return

      doc.setTextColor(...textColor)
      doc.setFont('times', fontStyle)
      doc.setFontSize(fontSize)
      const pad = 1.5
      const lines = doc.splitTextToSize(text, w - pad * 2)
      const lineH = fontSize * 0.35
      const totalH = lines.length * lineH
      const startY = y + h / 2 - totalH / 2 + lineH

      if (align === 'center') {
        doc.text(lines, x + w / 2, startY, { align: 'center' })
      } else if (align === 'left') {
        doc.text(lines, x + pad, startY)
      } else {
        doc.text(lines, x + w - pad, startY, { align: 'right' })
      }
    }

    const placeImage = (img: HTMLImageElement, bx: number, by: number, bw: number, bh: number) => {
      if (bw <= 0 || bh <= 0) return
      const ratio = img.width / img.height
      const boxRatio = bw / bh
      let fw = bw - 2, fh = bh - 2
      if (ratio > boxRatio) fh = fw / ratio
      else fw = fh * ratio
      if (fw <= 0 || fh <= 0) return
      doc.addImage(img, 'PNG', bx + (bw - fw) / 2, by + (bh - fh) / 2, fw, fh)
    }

    // ══════════════════════════════════════════════════════════════════════════
    cohortCronogramas.forEach((cr, idx) => {
      if (idx > 0) doc.addPage()

      let y = margin

      const logoW = 50
      const logoH = 35 // Altura mayor para que el logo se vea más grande
      const textW = pageW - margin * 2 - logoW * 2
      const textX = margin + logoW

      // ─── Encabezado texto ─────────────────────────────────────────────────
      const headerLines: { text: string; size: number; style: 'bold' | 'normal' }[] = [
        { text: 'REPÚBLICA BOLIVARIANA DE VENEZUELA', size: 8, style: 'bold' },
        { text: 'UNIVERSIDAD NACIONAL EXPERIMENTAL RÓMULO GALLEGOS', size: 9, style: 'bold' },
        { text: 'DECANATO DE POSTGRADO', size: 8, style: 'bold' },
        { text: 'MAESTRÍA EN GERENCIA DE LA SALUD PÚBLICA', size: 8, style: 'bold' },
        { text: `REGIÓN: ${(cr.aulaTerritorial?.region?.nombre || '').toUpperCase()}`, size: 7.5, style: 'bold' },
        { text: `AULA TERRITORIAL: ${(cr.aulaTerritorial?.nombre || '').toUpperCase()}`, size: 7.5, style: 'bold' },
      ]

      const headerH = headerLines.length * 4.6

      let ty = y + 3
      headerLines.forEach(line => {
        doc.setFont('times', line.style)
        doc.setFontSize(line.size)
        doc.setTextColor(...black)
        doc.text(line.text, textX + textW / 2, ty, { align: 'center' })
        ty += 4.6
      })

      // Colocamos los logos con la nueva altura y los centramos un poco verticalmente
      if (logoCaminos) placeImage(logoCaminos, margin, y - 2, logoW, logoH)
      if (logoUnerg) placeImage(logoUnerg, margin + logoW + textW, y - 2, logoW, logoH)

      y += Math.max(headerH, logoH - 2) + 5

      // ─── Título ───────────────────────────────────────────────────────────
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...red)
      const titulo = 'CRONOGRAMA DE PLANIFICACION ACADEMICA'
      doc.text(titulo, pageW / 2, y + 3, { align: 'center' })
      const tw = doc.getTextWidth(titulo)
      doc.setDrawColor(...red)
      doc.setLineWidth(0.3)
      doc.line(pageW / 2 - tw / 2, y + 3.5, pageW / 2 + tw / 2, y + 3.5)
      doc.setTextColor(...black)
      doc.setDrawColor(...black)
      y += 8

      // ─── Bloque de información ────────────────────────────────────────────
      // Layout exacto según imagen de referencia
      const rh = 6.5  // row height

      // Columnas (de izquierda a derecha, todas enteras)
      // A: Labels (TRIMESTRE/LAPSO/VOCERO)
      const aX = margin, aW = 38
      // Para filas 1-2, el valor ocupa bigValW desde bX hasta gX
      const bX = aX + aW       // = 46
      const bigValW = 152       // ancho del bloque de valor central
      const gX = bX + bigValW  // = 198  ← inicio columna COORD/CANTIDAD
      const gW = 50             // COORDINADOR / CANTIDAD label
      const hX = gX + gW        // = 248  ← labels FEM/MASC/TOTAL
      const hW = 20             // ancho label FEMENINO/MASCULINO/TOTAL
      const iX = hX + hW        // = 268  ← valores FEM/MASC/TOTAL
      const iW = Math.max(pageW - margin - iX, 8)  // = 21

      // Sub-columnas dentro del área bigValW para la fila VOCERO
      // "VOCERO:" label ocupa aW + bW. Las subcolumnas dividen el resto (130)
      const bW  = 22
      const cX2 = bX + bW   // = 68
      const cW2 = 44   // NOMBRE Y APELLIDO columna completa
      const dX2 = cX2 + cW2  // = 112
      const dW2 = 44   // DIRECCIÓN DE CORREO columna completa
      const eX2 = dX2 + dW2  // = 156
      const eW2 = gX - eX2   // = 42  TELÉFONO columna completa


      const trimTxt = cr.trimestre === 'Introductorio'
        ? 'INTRODUCTORIO'
        : `CURSO ${(cr.trimestre || '').toUpperCase()} TRIMESTRE`

      // ── Fila 1: TRIMESTRE ──────────────────────────────────────────────────
      drawCell('TRIMESTRE:', aX, y, aW, rh, yellow, black, 7, 'bold')
      drawCell(trimTxt, bX, y, bigValW, rh, undefined, black, 7, 'bold')
      // COORD ocupa filas 1-2 (alto 2 * rh)
      drawCell('COORDINADOR\nTERRITORIAL\nENLACE TERRITORIAL:', gX, y, gW, rh * 2, yellow, black, 5.5, 'bold')
      // Valor coord ocupa ancho hW+iW combinado, 2 filas
      drawCell(cr.aulaTerritorial?.coordinador || '', hX, y, hW + iW, rh * 2, undefined, black, 6.5, 'bold')
      y += rh

      // ── Fila 2: LAPSO ACADÉMICO ────────────────────────────────────────────
      drawCell('LAPSO ACADÉMICO:', aX, y, aW, rh, yellow, black, 6.5, 'bold')
      drawCell(`${cr.periodo?.anio || ''}-${cr.periodo?.numero || ''}`, bX, y, bigValW, rh, undefined, black, 8, 'bold')
      // (celdas gX y hX cubiertas por el span de 2 filas de fila 1)
      y += rh

      // ── Fila 3: VOCERO - fila de LABELS ────────────────────────────────────
      // VOCERO: label ocupa filas 3-4 y abarca aW + bW
      drawCell('VOCERO:', aX, y, aW + bW, rh * 2, yellow, black, 7, 'bold')
      // Sub-labels en fila 3 (FONDO BLANCO)
      drawCell('NOMBRE Y APELLIDO:', cX2, y, cW2, rh, undefined, black, 5.5, 'bold')
      drawCell('DIRECCIÓN DE\nCORREO:', dX2, y, dW2, rh, undefined, black, 5.5, 'bold')
      drawCell('TELÉFONO:', eX2, y, eW2, rh, undefined, black, 5.5, 'bold')
      // CANTIDAD ocupa filas 3-4-5
      drawCell('CANTIDAD DE\nPARTICIPANTES:', gX, y, gW, rh * 3, yellow, black, 5.5, 'bold')
      // FEMENINO label y valor en fila 3
      drawCell('FEMENINO:', hX, y, hW, rh, yellow, black, 5.5, 'bold')
      drawCell(`${cr.participantesFem || 0}`, iX, y, iW, rh, undefined, black, 7, 'bold')
      y += rh

      // ── Fila 4: VOCERO - fila de VALUES ────────────────────────────────────
      drawCell(cr.vocero || cr.asignaciones?.[0]?.docente?.nombre || '', cX2, y, cW2, rh, undefined, black, 6, 'normal')
      drawCell(cr.emailVocero || '', dX2, y, dW2, rh, undefined, black, 6, 'normal')
      drawCell(cr.telefonoVocero || '', eX2, y, eW2, rh, undefined, black, 6, 'normal')
      // MASCULINO
      drawCell('MASCULINO:', hX, y, hW, rh, yellow, black, 5.5, 'bold')
      drawCell(`${cr.participantesMasc || 0}`, iX, y, iW, rh, undefined, black, 7, 'bold')
      y += rh

      // ── Fila 5: TOTAL PARTICIPANTES ────────────────────────────────────────
      drawCell('', aX, y, aW + bW + cW2 + dW2 + eW2, rh)
      drawCell('TOTAL\nPARTICIPANTES:', hX, y, hW, rh, yellow, black, 4.5, 'bold')
      drawCell(`${(cr.participantesFem || 0) + (cr.participantesMasc || 0)}`, iX, y, iW, rh, undefined, black, 7, 'bold')
      y += rh + 3

      // ─── Encabezado tabla principal ───────────────────────────────────────
      // Anchos fijos (enteros)
      const tUC = 42
      const tCat = 40          // 40 / 8 = 5 exacto → sin decimales
      const tSub = 5           // tCat / 8 = 5
      const tDoc = 42
      const tLug = 18
      const tHor = 24
      const tFec = 28
      const tUc2 = 9
      const tHrs = 16
      const usedW = tUC + tCat + tDoc + tLug + tHor + tFec + tUc2 + tHrs
      const tMod = Math.max(pageW - margin * 2 - usedW, 15)

      const hR1 = 6, hR2 = 4, hR3 = 4
      const totalHead = hR1 + hR2 + hR3

      let tx = margin

      drawCell('UNIDAD\nCURRICULAR', tx, y, tUC, totalHead, yellow, black, 6, 'bold'); tx += tUC

      drawCell('TIPO DOCENTE', tx, y, tCat, hR1, yellow, black, 6, 'bold')
      drawCell('CONTRATADO', tx, y + hR1, tSub * 4, hR2, yellow, black, 5, 'bold')
      drawCell('ORDINARIO', tx + tSub * 4, y + hR1, tSub * 4, hR2, yellow, black, 5, 'bold')
      ;['HP', 'MT', 'TC', 'DE', 'HP', 'MT', 'TC', 'DE'].forEach((lbl, i) => {
        drawCell(lbl, tx + tSub * i, y + hR1 + hR2, tSub, hR3, yellow, black, 4, 'bold')
      })
      tx += tCat

      drawCell('NOMBRE\nDOCENTE', tx, y, tDoc, totalHead, yellow, black, 6, 'bold'); tx += tDoc
      drawCell('LUGAR', tx, y, tLug, totalHead, yellow, black, 6, 'bold'); tx += tLug
      drawCell('HORARIO', tx, y, tHor, totalHead, yellow, black, 6, 'bold'); tx += tHor
      drawCell('FECHAS DE\nENCUENTROS', tx, y, tFec, totalHead, yellow, black, 6, 'bold'); tx += tFec
      drawCell('U.C', tx, y, tUc2, totalHead, yellow, black, 6, 'bold'); tx += tUc2
      drawCell('CANT\nHORAS', tx, y, tHrs, totalHead, yellow, black, 6, 'bold'); tx += tHrs
      drawCell('MODALIDAD', tx, y, tMod, totalHead, yellow, black, 6, 'bold')

      y += totalHead

      // ─── Filas de datos ───────────────────────────────────────────────────
      const asignaciones: any[] = cr.asignaciones || []
      asignaciones.forEach((a: any) => {
        const fechas: any[] = a.fechas || []
        const numFechas = Math.max(fechas.length, 1)
        const rowH = Math.max(numFechas * 5 + 2, 12)

        tx = margin

        drawCell(a.unidad?.nombre || '', tx, y, tUC, rowH, undefined, black, 6, 'normal', 'center'); tx += tUC

        const catIdx = a.docente?.categoria === 'CONTRATADO' ? 0 : a.docente?.categoria === 'ORDINARIO' ? 4 : -1
        const dedIdx = a.docente?.dedicacion === 'HP' ? 0 : a.docente?.dedicacion === 'MT' ? 1 : a.docente?.dedicacion === 'TC' ? 2 : a.docente?.dedicacion === 'DE' ? 3 : -1
        for (let i = 0; i < 8; i++) {
          const checked = catIdx >= 0 && dedIdx >= 0 && i === catIdx + dedIdx
          drawCell(checked ? 'X' : '', tx + tSub * i, y, tSub, rowH, undefined, black, 7, 'bold')
        }
        tx += tCat

        drawCell((a.docente?.nombre || '').toUpperCase(), tx, y, tDoc, rowH, undefined, black, 6, 'bold', 'center'); tx += tDoc
        drawCell(a.lugar || '', tx, y, tLug, rowH, undefined, black, 6, 'normal', 'center'); tx += tLug
        drawCell(`${a.horaInicio || ''} -\n${a.horaFin || ''}`, tx, y, tHor, rowH, undefined, black, 6, 'normal', 'center'); tx += tHor

        if (fechas.length > 0) {
          const dateH = rowH / fechas.length
          fechas.forEach((f: any, fi: number) => {
            const d = new Date(f.fecha)
            const dateStr = new Date(d.getTime() + d.getTimezoneOffset() * 60000)
              .toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            drawCell(dateStr, tx, y + fi * dateH, tFec, dateH, undefined, black, 6.5, 'normal')
          })
        } else {
          drawCell('', tx, y, tFec, rowH)
        }
        tx += tFec

        drawCell(String(a.uc ?? ''), tx, y, tUc2, rowH, undefined, black, 7, 'normal'); tx += tUc2
        drawCell(a.cantHoras ? `${a.cantHoras}hr` : '', tx, y, tHrs, rowH, undefined, black, 7, 'normal'); tx += tHrs

        if (fechas.length > 0) {
          const dateH = rowH / fechas.length
          fechas.forEach((f: any, fi: number) => {
            drawCell((f.modalidad || a.modalidad || 'PRESENCIAL').toUpperCase(), tx, y + fi * dateH, tMod, dateH, undefined, black, 5.5, 'normal', 'center')
          })
        } else {
          drawCell((a.modalidad || 'PRESENCIAL').toUpperCase(), tx, y, tMod, rowH, undefined, black, 5.5, 'normal', 'center')
        }

        y += rowH
      })

      // ─── Filas vacías extra ───────────────────────────────────────────────
      const emptyRows = Math.max(3 - asignaciones.length, 0)
      for (let i = 0; i < emptyRows; i++) {
        tx = margin
        const eH = 10
        drawCell('', tx, y, tUC, eH); tx += tUC
        for (let j = 0; j < 8; j++) drawCell('', tx + tSub * j, y, tSub, eH)
        tx += tCat
        drawCell('', tx, y, tDoc, eH); tx += tDoc
        drawCell('', tx, y, tLug, eH); tx += tLug
        drawCell('', tx, y, tHor, eH); tx += tHor
        drawCell('', tx, y, tFec, eH); tx += tFec
        drawCell('', tx, y, tUc2, eH); tx += tUc2
        drawCell('', tx, y, tHrs, eH); tx += tHrs
        drawCell('', tx, y, tMod, eH)
        y += eH
      }
    })

    doc.save(`${filename}.pdf`)
  } catch (e) {
    console.error('Error generando PDF:', e)
    throw e
  }
}
