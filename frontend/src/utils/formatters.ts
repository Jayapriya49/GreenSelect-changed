export function formatNumber(val: number | undefined | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCapacity(mw: number | undefined | null): string {
  if (!mw && mw !== 0) return 'N/A';
  if (mw >= 1000) {
    return `${(mw / 1000).toFixed(2)} GW`;
  }
  return `${formatNumber(mw, 0)} MW`;
}

export function formatEnergy(gwh: number | undefined | null): string {
  if (!gwh && gwh !== 0) return 'N/A';
  if (gwh >= 1000) {
    return `${(gwh / 1000).toFixed(2)} TWh/yr`;
  }
  return `${formatNumber(gwh, 1)} GWh/yr`;
}

export function formatCO2(tonnes: number | undefined | null): string {
  if (!tonnes && tonnes !== 0) return 'N/A';
  if (tonnes >= 1_000_000) {
    return `${(tonnes / 1_000_000).toFixed(2)}M t/yr`;
  }
  if (tonnes >= 1_000) {
    return `${(tonnes / 1_000).toFixed(1)}k t/yr`;
  }
  return `${formatNumber(tonnes, 0)} t/yr`;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

export function formatLCOE(inr: number | undefined | null): string {
  if (!inr && inr !== 0) return 'N/A';
  return `₹${Number(inr).toFixed(2)} / kWh`;
}
