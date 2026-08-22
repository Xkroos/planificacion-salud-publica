export function determinarTipoViatico(docenteRegion?: string, aulaRegion?: string) {
  const dR = (docenteRegion || '').toLowerCase().trim();
  const aR = (aulaRegion || '').toLowerCase().trim();
  
  if (!dR || !aR) return 'NO_APLICA';
  
  const isSedeDocente = dR.includes('san juan') || dR.includes('guarico') || dR.includes('guárico');
  const isSedeAula = aR.includes('san juan') || aR.includes('guarico') || aR.includes('guárico');
  
  if (isSedeDocente && !isSedeAula) {
    return 'SEDE';
  }
  
  if (dR === aR || (dR.includes('caracas') && aR.includes('distrito capital')) || (dR.includes('distrito capital') && aR.includes('caracas'))) {
    return 'ZONA';
  }
  
  return 'NO_APLICA';
}
